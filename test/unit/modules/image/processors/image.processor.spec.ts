import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ImageStatusEnum } from 'src/enums/ImageStatusEnum';
import { Image } from 'src/modules/image/entities/image.entity';
import { PROCESS_IMAGE_JOB } from 'src/modules/image/constants/image-queue.constants';
import { ImageProcessor } from 'src/modules/image/processors/image.processor';
import { ProcessImageJobData } from 'src/modules/image/interfaces/process-image-job.interface';
import {
    processImageToWebp,
    WEBP_MIME_TYPE,
} from 'src/modules/image/utils/process-image.util';
import { createS3ServiceMock } from '../../../../mocks';

jest.mock('src/modules/image/utils/process-image.util', () => ({
    processImageToWebp: jest.fn(),
    WEBP_MIME_TYPE: 'image/webp',
}));

const processImageToWebpMock = processImageToWebp as jest.MockedFunction<
    typeof processImageToWebp
>;

describe('ImageProcessor', () => {
    let processor: ImageProcessor;
    let imageRepository: jest.Mocked<
        Pick<Repository<Image>, 'findOneBy' | 'update'>
    >;
    let s3Service: ReturnType<typeof createS3ServiceMock>;
    let loggerWarnSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    const image: Image = {
        id: 1,
        path: 'tmp/original.jpg',
        originalName: 'photo.jpg',
        title: 'My photo',
        mimetype: 'image/jpeg',
        width: 800,
        height: 600,
        status: ImageStatusEnum.PENDING,
        createdAt: new Date(),
    };

    const createJob = (
        name: string,
        imageId: number,
    ): Job<ProcessImageJobData> =>
        ({
            name,
            data: { imageId },
        }) as Job<ProcessImageJobData>;

    beforeEach(async () => {
        s3Service = createS3ServiceMock();
        imageRepository = {
            findOneBy: jest.fn(),
            update: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ImageProcessor,
                {
                    provide: getRepositoryToken(Image),
                    useValue: imageRepository,
                },
                s3Service.asProvider(),
            ],
        }).compile();

        processor = module.get(ImageProcessor);

        loggerWarnSpy = jest
            .spyOn(processor['logger'], 'warn')
            .mockImplementation(() => undefined);
        loggerErrorSpy = jest
            .spyOn(processor['logger'], 'error')
            .mockImplementation(() => undefined);

        imageRepository.findOneBy.mockResolvedValue(image);
        processImageToWebpMock.mockResolvedValue(Buffer.from('processed-webp'));
        s3Service.store.set(image.path, {
            body: Buffer.from('original-bytes'),
            contentType: 'image/jpeg',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        s3Service.reset();
        loggerWarnSpy.mockRestore();
        loggerErrorSpy.mockRestore();
    });

    describe('process', () => {
        it('ignores jobs with an unknown name', async () => {
            await processor.process(createJob('other-job', image.id));

            expect(imageRepository.findOneBy).not.toHaveBeenCalled();
            expect(imageRepository.update).not.toHaveBeenCalled();
        });

        it('logs a warning and returns when image is not found', async () => {
            imageRepository.findOneBy.mockResolvedValue(null);

            await processor.process(
                createJob(PROCESS_IMAGE_JOB, image.id),
            );

            expect(loggerWarnSpy).toHaveBeenCalledWith(
                `Image ${image.id} not found, skipping job`,
            );
            expect(imageRepository.update).not.toHaveBeenCalled();
            expect(s3Service.download).not.toHaveBeenCalled();
        });

        it('sets status to PROCESSING before processing', async () => {
            await processor.process(createJob(PROCESS_IMAGE_JOB, image.id));

            expect(imageRepository.update).toHaveBeenNthCalledWith(1, image.id, {
                status: ImageStatusEnum.PROCESSING,
            });
        });

        it('downloads original, processes image, uploads webp, and deletes tmp file', async () => {
            await processor.process(createJob(PROCESS_IMAGE_JOB, image.id));

            expect(s3Service.download).toHaveBeenCalledWith(image.path);
            expect(processImageToWebpMock).toHaveBeenCalledWith(
                Buffer.from('original-bytes'),
                image.width,
                image.height,
            );
            expect(s3Service.upload).toHaveBeenCalledWith(
                expect.stringMatching(/^images\/[\w-]+-photo\.webp$/),
                Buffer.from('processed-webp'),
                WEBP_MIME_TYPE,
            );
            expect(s3Service.delete).toHaveBeenCalledWith(image.path);
            expect(s3Service.store.has(image.path)).toBe(false);
        });

        it('updates image to UPLOADED with final path and webp mimetype', async () => {
            await processor.process(createJob(PROCESS_IMAGE_JOB, image.id));

            const uploadKey = s3Service.upload.mock.calls[0][0];

            expect(imageRepository.update).toHaveBeenLastCalledWith(image.id, {
                path: uploadKey,
                mimetype: WEBP_MIME_TYPE,
                status: ImageStatusEnum.UPLOADED,
            });
        });

        it('sets status to FAILED and rethrows when S3 download fails', async () => {
            const error = new Error('S3 download failed');
            s3Service.download.mockRejectedValueOnce(error);

            await expect(
                processor.process(createJob(PROCESS_IMAGE_JOB, image.id)),
            ).rejects.toThrow(error);

            expect(imageRepository.update).toHaveBeenCalledWith(image.id, {
                status: ImageStatusEnum.FAILED,
            });
            expect(loggerErrorSpy).toHaveBeenCalled();
            expect(s3Service.upload).not.toHaveBeenCalled();
        });

        it('sets status to FAILED and rethrows when image processing fails', async () => {
            const error = new Error('Sharp processing failed');
            processImageToWebpMock.mockRejectedValueOnce(error);

            await expect(
                processor.process(createJob(PROCESS_IMAGE_JOB, image.id)),
            ).rejects.toThrow(error);

            expect(imageRepository.update).toHaveBeenCalledWith(image.id, {
                status: ImageStatusEnum.FAILED,
            });
            expect(loggerErrorSpy).toHaveBeenCalled();
            expect(s3Service.upload).not.toHaveBeenCalled();
        });

        it('sets status to FAILED and rethrows when S3 upload fails', async () => {
            const error = new Error('S3 upload failed');
            s3Service.upload.mockRejectedValueOnce(error);

            await expect(
                processor.process(createJob(PROCESS_IMAGE_JOB, image.id)),
            ).rejects.toThrow(error);

            expect(imageRepository.update).toHaveBeenCalledWith(image.id, {
                status: ImageStatusEnum.FAILED,
            });
            expect(loggerErrorSpy).toHaveBeenCalled();
            expect(s3Service.delete).not.toHaveBeenCalled();
        });

        it('sets status to FAILED and rethrows when S3 delete fails', async () => {
            const error = new Error('S3 delete failed');
            s3Service.delete.mockRejectedValueOnce(error);

            await expect(
                processor.process(createJob(PROCESS_IMAGE_JOB, image.id)),
            ).rejects.toThrow(error);

            expect(imageRepository.update).toHaveBeenCalledWith(image.id, {
                status: ImageStatusEnum.FAILED,
            });
            expect(loggerErrorSpy).toHaveBeenCalled();
            expect(s3Service.upload).toHaveBeenCalled();
        });
    });
});
