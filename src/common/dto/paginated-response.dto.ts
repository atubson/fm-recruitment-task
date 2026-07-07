export interface PaginatedResponseDto<T> {
    offset: number;
    limit: number;
    total: number;
    data: T[];
}
