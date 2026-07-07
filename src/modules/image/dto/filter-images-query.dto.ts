import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FilterImagesQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string;
}
