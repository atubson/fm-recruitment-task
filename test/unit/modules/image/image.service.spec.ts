import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { readFile, unlink } from 'fs/promises';
import { ILike, Repository } from 'typeorm';
import { ImageStatusEnum } from 'src/enums/ImageStatusEnum';
import { Image } from 'src/modules/image/entities/image.entity';
import { ImageService } from 'src/modules/image/image.service';
import {
    IMAGE_QUEUE,
    PROCESS_IMAGE_JOB,
} from 'src/modules/image/constants/image-queue.constants';
import { createS3ServiceMock } from '../../../mocks';

jest.mock('fs/promises', () => ({
    readFile: jest.fn(),
    unlink: jest.fn(),
}));

const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

describe('ImageService', () => {
    let service: ImageService;
    let imageRepository: jest.Mocked<
        Pick<Repository<Image>, 'create' | 'save' | 'findOne' | 'findAndCount'>
    >;
    let s3Service: ReturnType<typeof createS3ServiceMock>;
    let imageQueue: { add: jest.Mock };

    const uploadDto = {
        title: 'My photo',
        width: 800,
        height: 600,
    };

    const multerFile = {
        fieldname: 'image',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        path: '/tmp/uploads/photo.jpg',
    } as Express.Multer.File;

    beforeEach(async () => {
        s3Service = createS3ServiceMock();
        imageQueue = { add: jest.fn().mockResolvedValue(undefined) };

        imageRepository = {
            create: jest.fn((entity) => entity as Image),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ImageService,
                {
                    provide: getRepositoryToken(Image),
                    useValue: imageRepository,
                },
                s3Service.asProvider(),
                {
                    provide: getQueueToken(IMAGE_QUEUE),
                    useValue: imageQueue,
                },
            ],
        }).compile();

        service = module.get(ImageService);

        readFileMock.mockResolvedValue(Buffer.from('file-bytes'));
        unlinkMock.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
        s3Service.reset();
    });

    describe('uploadImage', () => {
        const savedImage: Image = {
            id: 1,
            path: 'tmp/uuid.jpg',
            originalName: 'photo.jpg',
            title: uploadDto.title,
            mimetype: multerFile.mimetype,
            width: uploadDto.width,
            height: uploadDto.height,
            status: ImageStatusEnum.PENDING,
            createdAt: new Date(),
        };

        beforeEach(() => {
            imageRepository.save.mockResolvedValue(savedImage);
        });

        it('saves image as PENDING', async () => {
            await service.uploadImage(multerFile, uploadDto);

            expect(imageRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    originalName: 'photo.jpg',
                    title: uploadDto.title,
                    mimetype: multerFile.mimetype,
                    width: uploadDto.width,
                    height: uploadDto.height,
                    status: ImageStatusEnum.PENDING,
                }),
            );
            expect(imageRepository.save).toHaveBeenCalled();
        });

        it('uploads file buffer to S3 under tmp/', async () => {
            await service.uploadImage(multerFile, uploadDto);

            expect(readFileMock).toHaveBeenCalledWith(multerFile.path);
            expect(s3Service.upload).toHaveBeenCalledWith(
                expect.stringMatching(/^tmp\/[\w-]+\.jpg$/),
                Buffer.from('file-bytes'),
                multerFile.mimetype,
            );
        });

        it('enqueues processing job with image id', async () => {
            await service.uploadImage(multerFile, uploadDto);

            expect(imageQueue.add).toHaveBeenCalledWith(PROCESS_IMAGE_JOB, {
                imageId: savedImage.id,
            });
        });

        it('returns id, status, and status_label', async () => {
            const result = await service.uploadImage(multerFile, uploadDto);

            expect(result).toEqual({
                id: savedImage.id,
                status: ImageStatusEnum.PENDING,
                status_label: 'PENDING',
            });
        });

        it('deletes local temp file', async () => {
            await service.uploadImage(multerFile, uploadDto);

            expect(unlinkMock).toHaveBeenCalledWith(multerFile.path);
        });

        it('deletes local temp file when upload fails', async () => {
            s3Service.upload.mockRejectedValueOnce(new Error('S3 failed'));

            await expect(
                service.uploadImage(multerFile, uploadDto),
            ).rejects.toThrow('S3 failed');

            expect(unlinkMock).toHaveBeenCalledWith(multerFile.path);
        });
    });

    describe('getImageStatus', () => {
        it('returns status and status_label', async () => {
            imageRepository.findOne.mockResolvedValue({
                status: ImageStatusEnum.UPLOADED,
            } as Image);

            const result = await service.getImageStatus(1);

            expect(imageRepository.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                select: { status: true },
            });
            expect(result).toEqual({
                status: ImageStatusEnum.UPLOADED,
                status_label: 'UPLOADED',
            });
        });

        it('throws NotFoundException when image does not exist', async () => {
            imageRepository.findOne.mockResolvedValue(null);

            await expect(service.getImageStatus(99)).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.getImageStatus(99)).rejects.toThrow(
                'Image not found',
            );
        });
    });

    describe('getImages', () => {
        const uploadedImage: Pick<
            Image,
            'id' | 'path' | 'title' | 'width' | 'height'
        > = {
            id: 1,
            path: 'images/photo.webp',
            title: 'Summer vacation',
            width: 800,
            height: 600,
        };

        it('returns only UPLOADED images', async () => {
            imageRepository.findAndCount.mockResolvedValue([
                [uploadedImage as Image],
                1,
            ]);

            await service.getImages({ offset: 0, limit: 20 });

            expect(imageRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { status: ImageStatusEnum.UPLOADED },
                }),
            );
        });

        it('applies pagination with skip and take', async () => {
            imageRepository.findAndCount.mockResolvedValue([[], 0]);

            await service.getImages({ offset: 10, limit: 5 });

            expect(imageRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 10,
                    take: 5,
                }),
            );
        });

        it('filters by title using ILike', async () => {
            imageRepository.findAndCount.mockResolvedValue([[], 0]);

            await service.getImages({
                offset: 0,
                limit: 20,
                title: 'vacation',
            });

            expect(imageRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        title: ILike('%vacation%'),
                        status: ImageStatusEnum.UPLOADED,
                    },
                }),
            );
        });

        it('maps presigned URLs in response data', async () => {
            imageRepository.findAndCount.mockResolvedValue([
                [uploadedImage as Image],
                1,
            ]);

            const result = await service.getImages({ offset: 0, limit: 20 });

            expect(s3Service.getSignedObjectUrl).toHaveBeenCalledWith(
                uploadedImage.path,
            );
            expect(result).toEqual({
                offset: 0,
                limit: 20,
                total: 1,
                data: [
                    {
                        id: uploadedImage.id,
                        url: `https://signed.test.example/${uploadedImage.path}?expires=3600`,
                        title: uploadedImage.title,
                        width: uploadedImage.width,
                        height: uploadedImage.height,
                    },
                ],
            });
        });
    });

    describe('getImage', () => {
        const uploadedImage: Pick<
            Image,
            'id' | 'path' | 'originalName' | 'title' | 'width' | 'height'
        > = {
            id: 2,
            path: 'images/photo.webp',
            originalName: 'photo.jpg',
            title: 'My photo',
            width: 1024,
            height: 768,
        };

        it('returns image when status is UPLOADED', async () => {
            imageRepository.findOne.mockResolvedValue(uploadedImage as Image);

            const result = await service.getImage(2);

            expect(imageRepository.findOne).toHaveBeenCalledWith({
                where: { id: 2, status: ImageStatusEnum.UPLOADED },
                select: {
                    id: true,
                    path: true,
                    originalName: true,
                    title: true,
                    width: true,
                    height: true,
                },
            });
            expect(s3Service.getSignedObjectUrl).toHaveBeenCalledWith(
                uploadedImage.path,
            );
            expect(result).toEqual({
                id: uploadedImage.id,
                url: `https://signed.test.example/${uploadedImage.path}?expires=3600`,
                title: uploadedImage.title,
                width: uploadedImage.width,
                height: uploadedImage.height,
            });
        });

        it('throws NotFoundException when image is missing', async () => {
            imageRepository.findOne.mockResolvedValue(null);

            await expect(service.getImage(99)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('throws NotFoundException when image is not uploaded', async () => {
            imageRepository.findOne.mockResolvedValue(null);

            await expect(service.getImage(1)).rejects.toThrow(
                'Image not found',
            );

            expect(imageRepository.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 1, status: ImageStatusEnum.UPLOADED },
                }),
            );
        });
    });
});
