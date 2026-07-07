import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Image } from './entities/image.entity';
import { ImageService } from './image.service';
import { ImageController } from './image.controller';
import { S3Module } from '../s3/s3.module';
import { ImageUploadInterceptor } from '../../common/interceptors/image-upload.interceptor';
import { ImageFileValidationPipe } from './pipes/image-file-validation.pipe';
import { IMAGE_QUEUE } from './constants/image-queue.constants';
import { ImageProcessor } from './processors/image.processor';

@Module({
    imports: [
        TypeOrmModule.forFeature([Image]),
        S3Module,
        BullModule.registerQueue({
            name: IMAGE_QUEUE,
        }),
    ],
    controllers: [ImageController],
    providers: [
        ImageService,
        ImageProcessor,
        ImageUploadInterceptor,
        ImageFileValidationPipe,
    ],
})
export class ImageModule {}
