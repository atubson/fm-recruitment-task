import sharp from 'sharp';

const WEBP_QUALITY = 85;

export async function processImageToWebp(
    buffer: Buffer,
    width: number,
    height: number,
): Promise<Buffer> {
    return sharp(buffer)
        .rotate()
        .resize(width, height, { fit: 'cover' })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
}

export const WEBP_MIME_TYPE = 'image/webp';
