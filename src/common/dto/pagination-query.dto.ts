import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const DEFAULT_PAGINATION_OFFSET = 0;
export const DEFAULT_PAGINATION_LIMIT = 20;

const toIntWithDefault =
    (fallback: number) =>
    ({ value }: { value: unknown }): number => {
        if (value === undefined || value === null || value === '') {
            return fallback;
        }

        return Number(value);
    };

export class PaginationQueryDto {
    @ApiProperty({ description: 'The offset of the results', required: false, default: DEFAULT_PAGINATION_OFFSET })
    @Transform(toIntWithDefault(DEFAULT_PAGINATION_OFFSET))
    @IsInt()
    @Min(0)
    offset: number = DEFAULT_PAGINATION_OFFSET;

    @ApiProperty({ description: 'The limit of the results', required: false, default: DEFAULT_PAGINATION_LIMIT })
    @Transform(toIntWithDefault(DEFAULT_PAGINATION_LIMIT))
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = DEFAULT_PAGINATION_LIMIT;
}
