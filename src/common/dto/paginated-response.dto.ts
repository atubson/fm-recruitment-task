import { ApiProperty } from '@nestjs/swagger';
import { DEFAULT_PAGINATION_LIMIT, DEFAULT_PAGINATION_OFFSET } from './pagination-query.dto';

export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'The offset of the results', example: DEFAULT_PAGINATION_OFFSET })
    offset: number;

    @ApiProperty({ description: 'The limit of the results', example: DEFAULT_PAGINATION_LIMIT })
    limit: number;

    @ApiProperty({ description: 'The total number of results', example: 100 })
    total: number;

    data: T[];
}
