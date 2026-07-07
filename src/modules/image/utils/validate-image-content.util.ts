import { readFile } from 'fs/promises';
import sharp from 'sharp';
import { ValidationException } from '../../../common/exceptions/validation.exception';

const formatToMimeType: Record<string, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
};

export async function validateImageContent(
    file: Express.Multer.File,
    allowedMimeTypes: string[],
): Promise<void> {
    const input = await resolveFileInput(file);

    let metadata: sharp.Metadata;
    try {
        metadata = await sharp(input, { failOn: 'error' }).metadata();
    } catch {
        throw new ValidationException({
            image: ['Invalid or corrupted image file'],
        });
    }

    if (!metadata.format) {
        throw new ValidationException({
            image: ['Unable to detect image format from file content'],
        });
    }

    const detectedMimeType = formatToMimeType[metadata.format];
    if (!detectedMimeType || !allowedMimeTypes.includes(detectedMimeType)) {
        throw new ValidationException({
            image: [
                `Invalid image format. Allowed: ${allowedMimeTypes.join(', ')}`,
            ],
        });
    }

    if (file.mimetype !== detectedMimeType) {
        throw new ValidationException({
            image: ['File content does not match declared image type'],
        });
    }
}

async function resolveFileInput(
    file: Express.Multer.File,
): Promise<Buffer | string> {
    if (file.buffer?.length) {
        return file.buffer;
    }

    if (file.path) {
        return readFile(file.path);
    }

    throw new ValidationException({
        image: ['Invalid image file'],
    });
}
