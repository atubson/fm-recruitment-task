import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

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
    @Transform(toIntWithDefault(DEFAULT_PAGINATION_OFFSET))
    @IsInt()
    @Min(0)
    offset: number = DEFAULT_PAGINATION_OFFSET;

    @Transform(toIntWithDefault(DEFAULT_PAGINATION_LIMIT))
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = DEFAULT_PAGINATION_LIMIT;
}
