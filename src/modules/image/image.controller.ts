import { Controller } from '@nestjs/common';
import { ImageService } from './image.service';
import {
    Post,
    HttpCode,
    UseInterceptors,
    UploadedFile,
    Body,
    Get,
    Param,
    ParseIntPipe,
    Query,
} from '@nestjs/common';
import { CreateImageDto } from './dto/create-image.dto';
import { ImageUploadInterceptor } from '../../common/interceptors/image-upload.interceptor';
import { ImageFileValidationPipe } from './pipes/image-file-validation.pipe';
import { ImageResponseDto } from './dto';
import { ImageStatusResponseDto } from './dto/image-status-response.dto';
import { CreateImageResponseDto } from './dto/create-image-response.dto';
import { FilterImagesQueryDto } from './dto/filter-images-query.dto';
import { PaginatedResponseDto } from '../../common/dto';

@Controller('images')
export class ImageController {
    constructor(private readonly imageService: ImageService) {}

    @Get()
    @HttpCode(200)
    async getImages(@Query() query: FilterImagesQueryDto): Promise<PaginatedResponseDto<ImageResponseDto>> {
        return this.imageService.getImages(query);
    }

    @Post()
    @HttpCode(202)
    @UseInterceptors(ImageUploadInterceptor)
    async create(
        @UploadedFile(ImageFileValidationPipe)
        file: Express.Multer.File,
        @Body() dto: CreateImageDto,
    ): Promise<CreateImageResponseDto> {
        return this.imageService.uploadImage(file, dto);
    }

    @Get(':id/status')
    @HttpCode(200)
    async getStatus(@Param('id', ParseIntPipe) id: number): Promise<ImageStatusResponseDto> {
        return this.imageService.getImageStatus(id);
    }

    @Get(':id')
    @HttpCode(200)
    async getImage(@Param('id', ParseIntPipe) id: number): Promise<ImageResponseDto> {
        return this.imageService.getImage(id);
    }
}