import { PipeTransform, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { validateImageContent } from '../utils/validate-image-content.util';

@Injectable()
export class ImageFileValidationPipe implements PipeTransform {
    constructor(private readonly config: ConfigService) {}

    async transform(
        file?: Express.Multer.File,
    ): Promise<Express.Multer.File> {
        if (!file) {
            throw new ValidationException({
                image: ['Image file is required'],
            });
        }

        const allowedMimeTypes = this.config.get<string[]>(
            'upload.allowedMimeTypes',
        ) ?? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            await this.removeInvalidFile(file);
            throw new ValidationException({
                image: [
                    `Invalid image format. Allowed: ${allowedMimeTypes.join(', ')}`,
                ],
            });
        }

        const maxSize = Number(this.config.get('upload.maxSize'));
        if (maxSize && file.size > maxSize) {
            await this.removeInvalidFile(file);
            throw new ValidationException({
                image: [`File is too large. Maximum size is ${maxSize} bytes`],
            });
        }

        try {
            await validateImageContent(file, allowedMimeTypes);
        } catch (error) {
            await this.removeInvalidFile(file);
            throw error;
        }

        return file;
    }

    private async removeInvalidFile(file: Express.Multer.File): Promise<void> {
        if (!file.path) {
            return;
        }

        await unlink(file.path).catch(() => undefined);
    }
}
