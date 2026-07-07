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

export class CreateImageDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title: string;

    @Type(() => Number)
    @IsInt()
    @IsPositive()
    @Min(imageLimits.minWidth)
    @Max(imageLimits.maxWidth)
    width: number;

    @Type(() => Number)
    @IsInt()
    @IsPositive()
    @Min(imageLimits.minHeight)
    @Max(imageLimits.maxHeight)
    height: number;
}
