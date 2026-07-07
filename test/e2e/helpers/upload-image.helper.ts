import request from 'supertest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const SAMPLE_JPEG_PATH = resolve(
    __dirname,
    '../../fixtures/images/sample.jpg',
);
export const SAMPLE_PNG_PATH = resolve(
    __dirname,
    '../../fixtures/images/sample.png',
);
export const INVALID_TEXT_PATH = resolve(
    __dirname,
    '../../fixtures/images/invalid.txt',
);

export const INVALID_TEXT_BUFFER = readFileSync(INVALID_TEXT_PATH);
export const SAMPLE_JPEG_BUFFER = readFileSync(SAMPLE_JPEG_PATH);
export const SAMPLE_PNG_BUFFER = readFileSync(SAMPLE_PNG_PATH);

export interface UploadImageOptions {
    title?: string;
    width?: string | number;
    height?: string | number;
    extraFields?: Record<string, string>;
    filePath?: string;
    fileBuffer?: Buffer;
    filename?: string;
    contentType?: string;
    attachFile?: boolean;
    useDefaults?: boolean;
}

function setField(
    req: request.Test,
    key: string,
    value: string | number | undefined,
): request.Test {
    if (value === undefined) {
        return req;
    }

    return req.field(key, String(value));
}

export function uploadImage(
    server: Parameters<typeof request>[0],
    options: UploadImageOptions = {},
) {
    const {
        extraFields = {},
        filePath = SAMPLE_JPEG_PATH,
        attachFile = true,
        fileBuffer,
        filename = 'photo.jpg',
        contentType = 'image/jpeg',
        useDefaults = true,
    } = options;

    let req = request(server).post('/images');

    if ('title' in options) {
        req = setField(req, 'title', options.title);
    } else if (useDefaults) {
        req = req.field('title', 'My photo');
    }

    if ('width' in options) {
        req = setField(req, 'width', options.width);
    } else if (useDefaults) {
        req = req.field('width', '800');
    }

    if ('height' in options) {
        req = setField(req, 'height', options.height);
    } else if (useDefaults) {
        req = req.field('height', '600');
    }

    for (const [key, value] of Object.entries(extraFields)) {
        req = req.field(key, value);
    }

    if (attachFile) {
        if (fileBuffer) {
            req = req.attach('image', fileBuffer, { filename, contentType });
        } else {
            req = req.attach('image', filePath);
        }
    }

    return req;
}
