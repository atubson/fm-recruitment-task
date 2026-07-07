import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { parse } from 'path';
import { Repository } from 'typeorm';
import { ImageStatusEnum } from '../../../enums/ImageStatusEnum';
import { S3Service } from '../../s3/s3.service';
import {
    IMAGE_QUEUE,
    PROCESS_IMAGE_JOB,
} from '../constants/image-queue.constants';
import { ProcessImageJobData } from '../interfaces/process-image-job.interface';
import { Image } from '../entities/image.entity';
import {
    processImageToWebp,
    WEBP_MIME_TYPE,
} from '../utils/process-image.util';
import { randomUUID } from 'crypto';

@Processor(IMAGE_QUEUE)
export class ImageProcessor extends WorkerHost {
    private readonly logger = new Logger(ImageProcessor.name);

    constructor(
        @InjectRepository(Image)
        private readonly imageRepository: Repository<Image>,
        private readonly s3Service: S3Service,
    ) {
        super();
    }

    async process(job: Job<ProcessImageJobData>): Promise<void> {
        if (job.name !== PROCESS_IMAGE_JOB) {
            return;
        }

        const image = await this.imageRepository.findOneBy({
            id: job.data.imageId,
        });

        if (!image) {
            this.logger.warn(`Image ${job.data.imageId} not found, skipping job`);
            return;
        }

        const tmpKey = image.path;

        await this.imageRepository.update(image.id, {
            status: ImageStatusEnum.PROCESSING,
        });

        try {
            const original = await this.s3Service.download(tmpKey);
            const processed = await processImageToWebp(
                original,
                image.width,
                image.height,
            );

            const finalKey = this.buildFinalKey(image.originalName);

            await this.s3Service.upload(finalKey, processed, WEBP_MIME_TYPE);
            await this.s3Service.delete(tmpKey);

            await this.imageRepository.update(image.id, {
                path: finalKey,
                mimetype: WEBP_MIME_TYPE,
                status: ImageStatusEnum.UPLOADED,
            });
        } catch (error) {
            this.logger.error(
                `Failed to process image ${image.id}`,
                error instanceof Error ? error.stack : undefined,
            );

            await this.imageRepository.update(image.id, {
                status: ImageStatusEnum.FAILED,
            });

            throw error;
        }
    }

    private buildFinalKey(originalName: string): string {
        const { name } = parse(originalName);
        return `images/${randomUUID()}-${name}.webp`;
    }
}
