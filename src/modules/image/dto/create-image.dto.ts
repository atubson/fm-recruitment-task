import { Type } from 'class-transformer';
import {
    IsInt,
    IsNotEmpty,
    IsPositive,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { imageLimits } from '../../../config/upload';
import { ApiProperty } from '@nestjs/swagger';

export class CreateImageDto {
    @ApiProperty({ description: 'The title of the image', example: 'My photo', maxLength: 255, required: true })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title: string;

    @ApiProperty({ description: 'The width of the image', example: 800, minimum: imageLimits.minWidth, maximum: imageLimits.maxWidth, required: true })
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    @Min(imageLimits.minWidth)
    @Max(imageLimits.maxWidth)
    width: number;

    @ApiProperty({ description: 'The height of the image', example: 600, minimum: imageLimits.minHeight, maximum: imageLimits.maxHeight, required: true })
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    @Min(imageLimits.minHeight)
    @Max(imageLimits.maxHeight)
    height: number;
}
