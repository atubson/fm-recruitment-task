import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { readFile, unlink } from 'fs/promises';
import { extname } from 'path';
import { ILike, Repository } from 'typeorm';
import { ImageStatusEnum } from '../../enums/ImageStatusEnum';
import { S3Service } from '../s3/s3.service';
import {
    IMAGE_QUEUE,
    PROCESS_IMAGE_JOB,
} from './constants/image-queue.constants';
import { CreateImageDto } from './dto/create-image.dto';
import { CreateImageResponseDto } from './dto/create-image-response.dto';
import { ImageStatusResponseDto } from './dto/image-status-response.dto';
import { Image } from './entities/image.entity';
import { ProcessImageJobData } from './interfaces/process-image-job.interface';
import { FilterImagesQueryDto, ImageResponseDto } from './dto';
import { PaginatedResponseDto } from 'src/common/dto';

@Injectable()
export class ImageService {
    constructor(
        @InjectRepository(Image)
        private readonly imageRepository: Repository<Image>,
        private readonly s3Service: S3Service,
        @InjectQueue(IMAGE_QUEUE)
        private readonly imageQueue: Queue<ProcessImageJobData>,
    ) {}

    async uploadImage(
        file: Express.Multer.File,
        dto: CreateImageDto,
    ): Promise<CreateImageResponseDto> {
        const key = this.buildTmpKey(file.originalname);

        try {
            const buffer = await readFile(file.path);
            await this.s3Service.upload(key, buffer, file.mimetype);

            const image = this.imageRepository.create({
                path: key,
                originalName: file.originalname,
                title: dto.title,
                mimetype: file.mimetype,
                width: dto.width,
                height: dto.height,
                status: ImageStatusEnum.PENDING,
            });

            const saved = await this.imageRepository.save(image);

            await this.imageQueue.add(PROCESS_IMAGE_JOB, {
                imageId: saved.id,
            });

            return {
                id: saved.id,
                status: saved.status,
                status_label: ImageStatusEnum[saved.status],
            };
        } finally {
            await this.removeLocalFile(file.path);
        }
    }

    async getImageStatus(id: number): Promise<ImageStatusResponseDto> {
        const image = await this.imageRepository.findOne({
            where: { id },
            select: { status: true },
        });
        if (!image) {
            throw new NotFoundException('Image not found');
        }

        return {
            status: image.status,
            status_label: ImageStatusEnum[image.status],
        };
    }

    async getImages(query: FilterImagesQueryDto): Promise<PaginatedResponseDto<ImageResponseDto>> {
        const { offset, limit, title } = query;
        const [images, total] = await this.imageRepository.findAndCount({
            where: title ? { title: ILike(`%${title}%`), status: ImageStatusEnum.UPLOADED } : { status: ImageStatusEnum.UPLOADED },
            skip: offset,
            take: limit,
            select: { id: true, path: true, title: true, width: true, height: true },
            order: { createdAt: 'DESC' },
        });

        return {
            offset,
            limit,
            total,
            data: images.map(image => ({
                id: image.id,
                url: this.s3Service.getObjectUrl(image.path),
                title: image.title,
                width: image.width,
                height: image.height,
            })),
        };
    }

    async getImage(id: number): Promise<ImageResponseDto> {
        const image = await this.imageRepository.findOne({
            where: { id },
            select: { id: true, path: true, originalName: true, title: true, width: true, height: true },
        });
        if (!image) {
            throw new NotFoundException('Image not found');
        }

        return {
            id: image.id,
            url: this.s3Service.getObjectUrl(image.path),
            title: image.title,
            width: image.width,
            height: image.height,
        };
    }

    private buildTmpKey(originalName: string): string {
        const extension = extname(originalName).toLowerCase();
        return `tmp/${randomUUID()}${extension}`;
    }

    private async removeLocalFile(path?: string): Promise<void> {
        if (!path) {
            return;
        }

        await unlink(path).catch(() => undefined);
    }
}
