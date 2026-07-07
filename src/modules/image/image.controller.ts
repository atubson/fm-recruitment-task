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
import { CreateImageDto, CreateImageUploadDto, CreateImageResponseDto, ImageResponseDto, PaginatedImageResponseDto } from './dto';
import { ImageUploadInterceptor } from '../../common/interceptors/image-upload.interceptor';
import { ImageFileValidationPipe } from './pipes/image-file-validation.pipe';
import { ImageStatusResponseDto } from './dto/image-status-response.dto';
import { FilterImagesQueryDto } from './dto/filter-images-query.dto';
import { ApiAcceptedResponse, ApiBody, ApiConsumes, ApiOkResponse } from '@nestjs/swagger';
import {
    ApiImageIdParamErrors,
    ApiValidationErrorResponse,
    ApiNotFoundErrorResponse,
} from '../../common/swagger/api-error-responses.decorator';

@Controller('images')
export class ImageController {
    constructor(private readonly imageService: ImageService) {}

    @Get()
    @HttpCode(200)
    @ApiOkResponse({ type: PaginatedImageResponseDto })
    @ApiValidationErrorResponse()
    async getImages(@Query() query: FilterImagesQueryDto): Promise<PaginatedImageResponseDto> {
        return this.imageService.getImages(query);
    }

    @Post()
    @HttpCode(202)
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: CreateImageUploadDto })
    @ApiAcceptedResponse({
        type: CreateImageResponseDto,
        description: 'Image accepted for asynchronous processing',
    })
    @ApiValidationErrorResponse()
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
    @ApiOkResponse({ type: ImageStatusResponseDto })
    @ApiImageIdParamErrors()
    @ApiNotFoundErrorResponse()
    async getStatus(@Param('id', ParseIntPipe) id: number): Promise<ImageStatusResponseDto> {
        return this.imageService.getImageStatus(id);
    }

    @Get(':id')
    @HttpCode(200)
    @ApiOkResponse({ type: ImageResponseDto })
    @ApiImageIdParamErrors()
    @ApiNotFoundErrorResponse()
    async getImage(@Param('id', ParseIntPipe) id: number): Promise<ImageResponseDto> {
        return this.imageService.getImage(id);
    }
}
