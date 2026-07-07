import { ImageStatusEnum } from '../../../enums/ImageStatusEnum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateImageResponseDto {
    @ApiProperty({ description: 'The ID of the image', example: 1 })
    id: number;

    @ApiProperty({ description: 'The integer status of the image', example: ImageStatusEnum.UPLOADED, type: Number })
    status: ImageStatusEnum;

    @ApiProperty({ description: 'The status label of the image', example: 'Uploaded' })
    status_label: string;
}
