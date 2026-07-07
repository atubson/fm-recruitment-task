const parseLimit = (value: string | undefined, fallback: number): number =>
    Number(value) || fallback;

export const imageLimits = {
    maxWidth: parseLimit(process.env.IMAGE_MAX_WIDTH, 4000),
    maxHeight: parseLimit(process.env.IMAGE_MAX_HEIGHT, 4000),
    minWidth: parseLimit(process.env.IMAGE_MIN_WIDTH, 10),
    minHeight: parseLimit(process.env.IMAGE_MIN_HEIGHT, 10),
};

export const ALLOWED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
] as const;

export const DEFAULT_FILE_MAX_SIZE = 5242880;

export default () => ({
    upload: {
        maxSize: Number(process.env.FILE_MAX_SIZE) || DEFAULT_FILE_MAX_SIZE,
        maxWidth: imageLimits.maxWidth,
        maxHeight: imageLimits.maxHeight,
        minWidth: imageLimits.minWidth,
        minHeight: imageLimits.minHeight,
        allowedMimeTypes: [...ALLOWED_IMAGE_MIME_TYPES],
        temporaryFolder: process.env.UPLOAD_TMP_DIR || './tmp/uploads',
    },
});
