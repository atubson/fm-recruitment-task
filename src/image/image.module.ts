import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Image } from './entities/image.entity';
import { ImageService } from './image.service';
import { ImageController } from './image.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Image])],
    controllers: [ImageController],
    providers: [ImageService],
})
export class ImageModule {}