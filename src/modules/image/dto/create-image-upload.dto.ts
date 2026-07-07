import { ApiProperty } from '@nestjs/swagger';
import {
    ALLOWED_IMAGE_MIME_TYPES,
    DEFAULT_FILE_MAX_SIZE,
} from '../../../config/upload';
import { CreateImageDto } from './create-image.dto';

export class CreateImageUploadDto extends CreateImageDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        required: true,
        description: `Image file. Allowed types: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}. Max size: ${DEFAULT_FILE_MAX_SIZE} bytes (5 MB).`,
    })
    image: Express.Multer.File;
}
