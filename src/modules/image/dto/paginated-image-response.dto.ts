import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { ImageResponseDto } from './image-response.dto';

export class PaginatedImageResponseDto extends PaginatedResponseDto<ImageResponseDto> {
    @ApiProperty({ type: () => ImageResponseDto, isArray: true })
    declare data: ImageResponseDto[];
}
