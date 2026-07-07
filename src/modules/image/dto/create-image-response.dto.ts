import { ImageStatusEnum } from '../../../enums/ImageStatusEnum';

export class CreateImageResponseDto {
    id: number;
    status: ImageStatusEnum;
    status_label: string;
}
