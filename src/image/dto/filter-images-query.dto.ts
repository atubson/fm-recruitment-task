import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FilterImagesQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string;
}
