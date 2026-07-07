import { DataSource } from 'typeorm';
import request from 'supertest';
import { ImageStatusEnum } from 'src/enums/ImageStatusEnum';
import {
    DEFAULT_PAGINATION_LIMIT,
    DEFAULT_PAGINATION_OFFSET,
} from 'src/common/dto/pagination-query.dto';
import {
    ALLOWED_IMAGE_MIME_TYPES,
    DEFAULT_FILE_MAX_SIZE,
    imageLimits,
} from 'src/config/upload';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
    IMAGE_QUEUE,
    PROCESS_IMAGE_JOB,
} from 'src/modules/image/constants/image-queue.constants';
import { getE2eApp, getS3Mock } from './e2e-test-context';
import { createImage, createImages } from './fixtures/image.fixture';
import {
    INVALID_TEXT_BUFFER,
    SAMPLE_JPEG_BUFFER,
    SAMPLE_JPEG_PATH,
    SAMPLE_PNG_BUFFER,
    SAMPLE_PNG_PATH,
    uploadImage,
} from './helpers/upload-image.helper';
import { getImageRepository } from './fixtures/image.fixture';

function getDataSource(): DataSource {
    return getE2eApp().get(DataSource);
}

function getImageQueue(): Queue {
    return getE2eApp().get(getQueueToken(IMAGE_QUEUE));
}

function expectValidationErrors(
    body: { errors: Record<string, string[]>[] },
    field: string,
    messages: string[],
): void {
    expect(body).toEqual({
        errors: [{ [field]: messages }],
    });
}

function expectNotFound(
    body: { message: string; error: string; statusCode: number },
    message = 'Image not found',
): void {
    expect(body).toEqual({
        message,
        error: 'Not Found',
        statusCode: 404,
    });
}

function expectBadRequest(
    body: { message: string; error: string; statusCode: number },
    message: string,
): void {
    expect(body).toEqual({
        message,
        error: 'Bad Request',
        statusCode: 400,
    });
}

function expectImageValidationError(
    body: { errors: Record<string, string[]>[] },
    messages: string[],
): void {
    expect(body).toEqual({
        errors: [{ image: messages }],
    });
}

const allowedMimeTypes = [...ALLOWED_IMAGE_MIME_TYPES];

describe('GET /images', () => {
    describe('pagination', () => {
        it('returns default offset and limit when query params are omitted', async () => {
            await createImage(getDataSource(), { title: 'Sunset' });

            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .expect(200);

            expect(response.body).toEqual({
                offset: DEFAULT_PAGINATION_OFFSET,
                limit: DEFAULT_PAGINATION_LIMIT,
                total: 1,
                data: [
                    expect.objectContaining({
                        id: 1,
                        title: 'Sunset',
                    }),
                ],
            });
        });

        it('returns an empty page when no uploaded images exist', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .expect(200);

            expect(response.body).toEqual({
                offset: DEFAULT_PAGINATION_OFFSET,
                limit: DEFAULT_PAGINATION_LIMIT,
                total: 0,
                data: [],
            });
        });

        it('paginates with custom offset and limit', async () => {
            await createImages(
                getDataSource(),
                Array.from({ length: 5 }, (_, index) => ({
                    title: `Image ${index + 1}`,
                    path: `images/image-${index + 1}.webp`,
                    createdAt: new Date(`2024-01-0${index + 1}T12:00:00Z`),
                })),
            );

            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ offset: 1, limit: 2 })
                .expect(200);

            expect(response.body).toEqual({
                offset: 1,
                limit: 2,
                total: 5,
                data: [
                    expect.objectContaining({ title: 'Image 4' }),
                    expect.objectContaining({ title: 'Image 3' }),
                ],
            });
        });

        it('returns an empty data array when offset exceeds total', async () => {
            await createImages(
                getDataSource(),
                [{ title: 'Only one' }, { title: 'Only two' }],
            );

            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ offset: 10, limit: 5 })
                .expect(200);

            expect(response.body).toEqual({
                offset: 10,
                limit: 5,
                total: 2,
                data: [],
            });
        });

        it('returns a partial last page', async () => {
            await createImages(
                getDataSource(),
                Array.from({ length: 5 }, (_, index) => ({
                    title: `Image ${index + 1}`,
                    createdAt: new Date(`2024-02-0${index + 1}T12:00:00Z`),
                })),
            );

            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ offset: 4, limit: 2 })
                .expect(200);

            expect(response.body.total).toBe(5);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].title).toBe('Image 1');
        });

        it('supports the maximum allowed page size', async () => {
            await createImages(
                getDataSource(),
                Array.from({ length: 101 }, (_, index) => ({
                    title: `Image ${index + 1}`,
                })),
            );

            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ offset: 0, limit: 100 })
                .expect(200);

            expect(response.body.limit).toBe(100);
            expect(response.body.total).toBe(101);
            expect(response.body.data).toHaveLength(100);
        });
    });

    describe('uploaded status filter', () => {
        it.each([
            ['PENDING', ImageStatusEnum.PENDING],
            ['PROCESSING', ImageStatusEnum.PROCESSING],
            ['FAILED', ImageStatusEnum.FAILED],
        ])(
            'does not return images with %s status',
            async (_statusLabel, status) => {
                await createImage(getDataSource(), {
                    title: 'Not uploaded image',
                    status,
                });

                const response = await request(getE2eApp().getHttpServer())
                    .get('/images')
                    .expect(200);

                expect(response.body).toEqual({
                    offset: DEFAULT_PAGINATION_OFFSET,
                    limit: DEFAULT_PAGINATION_LIMIT,
                    total: 0,
                    data: [],
                });
            },
        );

        it('returns only uploaded images when mixed with other statuses', async () => {
            await createImages(getDataSource(), [
                {
                    title: 'Ready',
                    status: ImageStatusEnum.UPLOADED,
                    path: 'images/ready.webp',
                },
                {
                    title: 'Waiting',
                    status: ImageStatusEnum.PENDING,
                    path: 'images/waiting.webp',
                },
                {
                    title: 'In progress',
                    status: ImageStatusEnum.PROCESSING,
                    path: 'images/processing.webp',
                },
                {
                    title: 'Broken',
                    status: ImageStatusEnum.FAILED,
                    path: 'images/failed.webp',
                },
            ]);

            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .expect(200);

            expect(response.body.total).toBe(1);
            expect(response.body.data).toEqual([
                expect.objectContaining({
                    title: 'Ready',
                    url: 'https://signed.test.example/images/ready.webp?expires=3600',
                }),
            ]);
        });
    });

    describe('title filter', () => {
        beforeEach(async () => {
            await createImages(getDataSource(), [
                {
                    title: 'Summer vacation',
                    path: 'images/summer.webp',
                    createdAt: new Date('2024-06-01T12:00:00Z'),
                },
                {
                    title: 'Winter vacation',
                    path: 'images/winter.webp',
                    createdAt: new Date('2024-05-01T12:00:00Z'),
                },
                {
                    title: 'City skyline',
                    path: 'images/city.webp',
                    createdAt: new Date('2024-04-01T12:00:00Z'),
                },
            ]);
        });

        it('returns all uploaded images when title is omitted', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .expect(200);

            expect(response.body.total).toBe(3);
            expect(response.body.data.map((image: { title: string }) => image.title)).toEqual([
                'Summer vacation',
                'Winter vacation',
                'City skyline',
            ]);
        });

        it('filters by partial case-insensitive title match', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ title: 'VAC' })
                .expect(200);

            expect(response.body.total).toBe(2);
            expect(response.body.data.map((image: { title: string }) => image.title)).toEqual([
                'Summer vacation',
                'Winter vacation',
            ]);
        });

        it('filters by exact title match', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ title: 'City skyline' })
                .expect(200);

            expect(response.body.total).toBe(1);
            expect(response.body.data[0].title).toBe('City skyline');
        });

        it('returns an empty page when no title matches', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ title: 'beach' })
                .expect(200);

            expect(response.body).toEqual({
                offset: DEFAULT_PAGINATION_OFFSET,
                limit: DEFAULT_PAGINATION_LIMIT,
                total: 0,
                data: [],
            });
        });

        it('combines title filter with pagination', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ title: 'vacation', offset: 1, limit: 1 })
                .expect(200);

            expect(response.body).toEqual({
                offset: 1,
                limit: 1,
                total: 2,
                data: [expect.objectContaining({ title: 'Winter vacation' })],
            });
        });

        it('does not return non-uploaded images even when title matches', async () => {
            await createImage(getDataSource(), {
                title: 'Pending vacation',
                status: ImageStatusEnum.PENDING,
            });

            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ title: 'vacation' })
                .expect(200);

            expect(response.body.total).toBe(2);
            expect(
                response.body.data.every((image: { title: string }) =>
                    image.title.endsWith('vacation'),
                ),
            ).toBe(true);
            expect(
                response.body.data.some(
                    (image: { title: string }) => image.title === 'Pending vacation',
                ),
            ).toBe(false);
        });
    });

    describe('validation', () => {
        it('returns 422 for a negative offset', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ offset: -1 })
                .expect(422);

            expectValidationErrors(response.body, 'offset', [
                'offset must not be less than 0',
            ]);
        });

        it('returns 422 for a non-integer offset', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ offset: 'abc' })
                .expect(422);

            expectValidationErrors(response.body, 'offset', [
                'offset must not be less than 0',
                'offset must be an integer number',
            ]);
        });

        it('returns 422 for a limit below 1', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ limit: 0 })
                .expect(422);

            expectValidationErrors(response.body, 'limit', [
                'limit must not be less than 1',
            ]);
        });

        it('returns 422 for a limit above 100', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ limit: 101 })
                .expect(422);

            expectValidationErrors(response.body, 'limit', [
                'limit must not be greater than 100',
            ]);
        });

        it('returns 422 for a non-integer limit', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ limit: 'ten' })
                .expect(422);

            expectValidationErrors(response.body, 'limit', [
                'limit must not be greater than 100',
                'limit must not be less than 1',
                'limit must be an integer number',
            ]);
        });

        it('returns 422 for a title longer than 255 characters', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ title: 'a'.repeat(256) })
                .expect(422);

            expectValidationErrors(response.body, 'title', [
                'title must be shorter than or equal to 255 characters',
            ]);
        });

        it('returns 422 for unknown query parameters', async () => {
            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .query({ unknown: 'value' })
                .expect(422);

            expectValidationErrors(response.body, 'unknown', [
                'property unknown should not exist',
            ]);
        });
    });

    describe('response shape', () => {
        it('returns presigned urls and orders results by createdAt descending', async () => {
            const s3Mock = getS3Mock();

            await createImages(getDataSource(), [
                {
                    title: 'Oldest',
                    path: 'images/oldest.webp',
                    width: 100,
                    height: 200,
                    createdAt: new Date('2024-01-01T12:00:00Z'),
                },
                {
                    title: 'Newest',
                    path: 'images/newest.webp',
                    width: 300,
                    height: 400,
                    createdAt: new Date('2024-03-01T12:00:00Z'),
                },
                {
                    title: 'Middle',
                    path: 'images/middle.webp',
                    width: 500,
                    height: 600,
                    createdAt: new Date('2024-02-01T12:00:00Z'),
                },
            ]);

            const response = await request(getE2eApp().getHttpServer())
                .get('/images')
                .expect(200);

            expect(response.body.data).toEqual([
                {
                    id: 2,
                    url: 'https://signed.test.example/images/newest.webp?expires=3600',
                    title: 'Newest',
                    width: 300,
                    height: 400,
                },
                {
                    id: 3,
                    url: 'https://signed.test.example/images/middle.webp?expires=3600',
                    title: 'Middle',
                    width: 500,
                    height: 600,
                },
                {
                    id: 1,
                    url: 'https://signed.test.example/images/oldest.webp?expires=3600',
                    title: 'Oldest',
                    width: 100,
                    height: 200,
                },
            ]);
            expect(s3Mock.getSignedObjectUrl).toHaveBeenCalled();
        });
    });
});

describe('GET /images/:id', () => {
    it('returns an uploaded image with a presigned url', async () => {
        const s3Mock = getS3Mock();
        const image = await createImage(getDataSource(), {
            title: 'Mountain view',
            path: 'images/mountain.webp',
            width: 1920,
            height: 1080,
            status: ImageStatusEnum.UPLOADED,
        });

        const response = await request(getE2eApp().getHttpServer())
            .get(`/images/${image.id}`)
            .expect(200);

        expect(response.body).toEqual({
            id: image.id,
            url: 'https://signed.test.example/images/mountain.webp?expires=3600',
            title: 'Mountain view',
            width: 1920,
            height: 1080,
        });
        expect(s3Mock.getSignedObjectUrl).toHaveBeenCalledWith(
            'images/mountain.webp',
        );
    });

    it('returns 404 when the image does not exist', async () => {
        const response = await request(getE2eApp().getHttpServer())
            .get('/images/999')
            .expect(404);

        expectNotFound(response.body);
    });

    it.each([
        ['PENDING', ImageStatusEnum.PENDING],
        ['PROCESSING', ImageStatusEnum.PROCESSING],
        ['FAILED', ImageStatusEnum.FAILED],
    ])(
        'returns 404 when the image status is %s',
        async (_statusLabel, status) => {
            const image = await createImage(getDataSource(), {
                title: 'Not ready',
                status,
            });

            const response = await request(getE2eApp().getHttpServer())
                .get(`/images/${image.id}`)
                .expect(404);

            expectNotFound(response.body);
        },
    );

    it('returns 400 for a non-numeric id', async () => {
        const response = await request(getE2eApp().getHttpServer())
            .get('/images/abc')
            .expect(400);

        expectBadRequest(
            response.body,
            'Validation failed (numeric string is expected)',
        );
    });

    it('returns 400 for a floating-point id', async () => {
        const response = await request(getE2eApp().getHttpServer())
            .get('/images/1.5')
            .expect(400);

        expectBadRequest(
            response.body,
            'Validation failed (numeric string is expected)',
        );
    });
});

describe('GET /images/:id/status', () => {
    it.each([
        ['PENDING', ImageStatusEnum.PENDING],
        ['PROCESSING', ImageStatusEnum.PROCESSING],
        ['UPLOADED', ImageStatusEnum.UPLOADED],
        ['FAILED', ImageStatusEnum.FAILED],
    ])('returns status and status_label for %s images', async (statusLabel, status) => {
        const image = await createImage(getDataSource(), {
            title: `${statusLabel} image`,
            status,
        });

        const response = await request(getE2eApp().getHttpServer())
            .get(`/images/${image.id}/status`)
            .expect(200);

        expect(response.body).toEqual({
            status,
            status_label: statusLabel,
        });
    });

    it('returns 404 when the image does not exist', async () => {
        const response = await request(getE2eApp().getHttpServer())
            .get('/images/999/status')
            .expect(404);

        expectNotFound(response.body);
    });

    it('returns 400 for a non-numeric id', async () => {
        const response = await request(getE2eApp().getHttpServer())
            .get('/images/abc/status')
            .expect(400);

        expectBadRequest(
            response.body,
            'Validation failed (numeric string is expected)',
        );
    });

    it('returns 400 for a floating-point id', async () => {
        const response = await request(getE2eApp().getHttpServer())
            .get('/images/2.7/status')
            .expect(400);

        expectBadRequest(
            response.body,
            'Validation failed (numeric string is expected)',
        );
    });
});

describe('POST /images', () => {
    describe('success', () => {
        it('accepts a valid upload, stores metadata, uploads to S3, and enqueues processing', async () => {
            const s3Mock = getS3Mock();
            const addSpy = jest
                .spyOn(getImageQueue(), 'add')
                .mockResolvedValue({ id: 'job-1' } as never);

            const response = await uploadImage(getE2eApp().getHttpServer(), {
                title: 'Beach sunset',
                width: 1024,
                height: 768,
                filePath: SAMPLE_JPEG_PATH,
            }).expect(202);

            expect(response.body).toEqual({
                id: 1,
                status: ImageStatusEnum.PENDING,
                status_label: 'PENDING',
            });

            const savedImage = await getImageRepository(getDataSource()).findOne({
                where: { id: response.body.id },
            });

            expect(savedImage).toMatchObject({
                title: 'Beach sunset',
                originalName: 'sample.jpg',
                mimetype: 'image/jpeg',
                width: 1024,
                height: 768,
                status: ImageStatusEnum.PENDING,
            });
            expect(savedImage?.path).toMatch(/^tmp\/.+\.jpg$/);

            expect(s3Mock.upload).toHaveBeenCalledTimes(1);
            expect(s3Mock.upload).toHaveBeenCalledWith(
                savedImage?.path,
                expect.any(Buffer),
                'image/jpeg',
            );
            expect(s3Mock.store.get(savedImage!.path)?.contentType).toBe(
                'image/jpeg',
            );

            expect(addSpy).toHaveBeenCalledTimes(1);
            expect(addSpy).toHaveBeenCalledWith(
                PROCESS_IMAGE_JOB,
                { imageId: savedImage?.id },
            );
            addSpy.mockRestore();
        });

        it('accepts png uploads', async () => {
            const addSpy = jest
                .spyOn(getImageQueue(), 'add')
                .mockResolvedValue({ id: 'job-1' } as never);

            const response = await uploadImage(getE2eApp().getHttpServer(), {
                title: 'Tiny png',
                width: imageLimits.minWidth,
                height: imageLimits.minHeight,
                fileBuffer: SAMPLE_PNG_BUFFER,
                filename: 'sample.png',
                contentType: 'image/png',
            }).expect(202);

            const savedImage = await getImageRepository(getDataSource()).findOne({
                where: { id: response.body.id },
            });

            expect(savedImage).toMatchObject({
                title: 'Tiny png',
                originalName: 'sample.png',
                mimetype: 'image/png',
                width: imageLimits.minWidth,
                height: imageLimits.minHeight,
                status: ImageStatusEnum.PENDING,
            });
            addSpy.mockRestore();
        });
    });

    describe('file validation', () => {
        it('returns 422 when the image file is missing', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                attachFile: false,
            }).expect(422);

            expectImageValidationError(response.body, ['Image file is required']);
        });

        it('returns 422 for a disallowed mime type', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                fileBuffer: INVALID_TEXT_BUFFER,
                filename: 'notes.txt',
                contentType: 'text/plain',
            }).expect(422);

            expectImageValidationError(response.body, [
                `Invalid image format. Allowed: ${allowedMimeTypes.join(', ')}`,
            ]);
        });

        it('returns 422 for a corrupted image file', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                fileBuffer: Buffer.from('not-an-image'),
                filename: 'broken.jpg',
                contentType: 'image/jpeg',
            }).expect(422);

            expectImageValidationError(response.body, [
                'Invalid or corrupted image file',
            ]);
        });

        it('returns 422 when declared mime type does not match file content', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                fileBuffer: SAMPLE_JPEG_BUFFER,
                filename: 'photo.png',
                contentType: 'image/png',
            }).expect(422);

            expectImageValidationError(response.body, [
                'File content does not match declared image type',
            ]);
        });

        it('returns 413 when the file exceeds the maximum size', async () => {
            await uploadImage(getE2eApp().getHttpServer(), {
                fileBuffer: Buffer.alloc(DEFAULT_FILE_MAX_SIZE + 1, 1),
                filename: 'large.jpg',
                contentType: 'image/jpeg',
            }).expect(413);
        });

        it('does not persist an image row when file validation fails', async () => {
            const addSpy = jest.spyOn(getImageQueue(), 'add');

            await uploadImage(getE2eApp().getHttpServer(), {
                fileBuffer: Buffer.from('not-an-image'),
                filename: 'broken.jpg',
                contentType: 'image/jpeg',
            }).expect(422);

            const count = await getImageRepository(getDataSource()).count();
            expect(count).toBe(0);
            expect(getS3Mock().upload).not.toHaveBeenCalled();
            expect(addSpy).not.toHaveBeenCalled();
            addSpy.mockRestore();
        });
    });

    describe('body validation', () => {
        it('returns 422 when title is missing', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                width: 800,
                height: 600,
                useDefaults: false,
            }).expect(422);

            expectValidationErrors(response.body, 'title', [
                'title must be shorter than or equal to 255 characters',
                'title should not be empty',
                'title must be a string',
            ]);
        });

        it('returns 422 when title is empty', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                title: '',
            }).expect(422);

            expectValidationErrors(response.body, 'title', [
                'title should not be empty',
            ]);
        });

        it('returns 422 when title exceeds 255 characters', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                title: 'a'.repeat(256),
            }).expect(422);

            expectValidationErrors(response.body, 'title', [
                'title must be shorter than or equal to 255 characters',
            ]);
        });

        it('returns 422 when width is missing', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                title: 'My photo',
                height: 600,
                useDefaults: false,
            }).expect(422);

            expectValidationErrors(response.body, 'width', [
                'width must not be greater than 4000',
                'width must not be less than 10',
                'width must be a positive number',
                'width must be an integer number',
            ]);
        });

        it('returns 422 when width is below the minimum', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                width: imageLimits.minWidth - 1,
            }).expect(422);

            expectValidationErrors(response.body, 'width', [
                `width must not be less than ${imageLimits.minWidth}`,
            ]);
        });

        it('returns 422 when width exceeds the maximum', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                width: imageLimits.maxWidth + 1,
            }).expect(422);

            expectValidationErrors(response.body, 'width', [
                `width must not be greater than ${imageLimits.maxWidth}`,
            ]);
        });

        it('returns 422 when width is not an integer', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                width: 'abc',
            }).expect(422);

            expectValidationErrors(response.body, 'width', [
                `width must not be greater than ${imageLimits.maxWidth}`,
                `width must not be less than ${imageLimits.minWidth}`,
                'width must be a positive number',
                'width must be an integer number',
            ]);
        });

        it('returns 422 when height is missing', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                title: 'My photo',
                width: 800,
                useDefaults: false,
            }).expect(422);

            expectValidationErrors(response.body, 'height', [
                'height must not be greater than 4000',
                'height must not be less than 10',
                'height must be a positive number',
                'height must be an integer number',
            ]);
        });

        it('returns 422 when height is below the minimum', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                height: imageLimits.minHeight - 1,
            }).expect(422);

            expectValidationErrors(response.body, 'height', [
                `height must not be less than ${imageLimits.minHeight}`,
            ]);
        });

        it('returns 422 when height exceeds the maximum', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                height: imageLimits.maxHeight + 1,
            }).expect(422);

            expectValidationErrors(response.body, 'height', [
                `height must not be greater than ${imageLimits.maxHeight}`,
            ]);
        });

        it('returns 422 when height is not an integer', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                height: 'abc',
            }).expect(422);

            expectValidationErrors(response.body, 'height', [
                `height must not be greater than ${imageLimits.maxHeight}`,
                `height must not be less than ${imageLimits.minHeight}`,
                'height must be a positive number',
                'height must be an integer number',
            ]);
        });

        it('returns 422 for unknown body fields', async () => {
            const response = await uploadImage(getE2eApp().getHttpServer(), {
                extraFields: { unexpected: 'value' },
            }).expect(422);

            expectValidationErrors(response.body, 'unexpected', [
                'property unexpected should not exist',
            ]);
        });

        it('does not persist an image row when body validation fails', async () => {
            const addSpy = jest.spyOn(getImageQueue(), 'add');

            await uploadImage(getE2eApp().getHttpServer(), {
                title: '',
            }).expect(422);

            const count = await getImageRepository(getDataSource()).count();
            expect(count).toBe(0);
            expect(getS3Mock().upload).not.toHaveBeenCalled();
            expect(addSpy).not.toHaveBeenCalled();
            addSpy.mockRestore();
        });
    });
});
