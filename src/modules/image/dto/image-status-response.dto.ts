import { ApiProperty } from '@nestjs/swagger';
import { ImageStatusEnum } from '../../../enums/ImageStatusEnum';

export class ImageStatusResponseDto {
    @ApiProperty({ description: 'The integer status of the image', example: ImageStatusEnum.UPLOADED, type: Number })
    status: ImageStatusEnum;

    @ApiProperty({ description: 'The status label of the image', example: 'Uploaded' })
    status_label: string;
}
