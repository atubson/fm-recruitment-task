import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateImageDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title: string;

    @Type(() => Number)
    @IsInt()
    @IsPositive()
    width: number;

    @Type(() => Number)
    @IsInt()
    @IsPositive()
    height: number;
}
