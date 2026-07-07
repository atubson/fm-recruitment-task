import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ApiProperty } from '@nestjs/swagger';

export class FilterImagesQueryDto extends PaginationQueryDto {
    @ApiProperty({ description: 'The title of the image to filter by', required: false, maxLength: 255, example: 'Image title' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string;
}
