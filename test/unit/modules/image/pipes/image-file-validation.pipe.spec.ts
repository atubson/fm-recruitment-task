import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { ValidationException } from 'src/common/exceptions/validation.exception';
import { ALLOWED_IMAGE_MIME_TYPES, DEFAULT_FILE_MAX_SIZE } from 'src/config/upload';
import { ImageFileValidationPipe } from 'src/modules/image/pipes/image-file-validation.pipe';
import { validateImageContent } from 'src/modules/image/utils/validate-image-content.util';

jest.mock('fs/promises', () => ({
    unlink: jest.fn(),
}));

jest.mock('src/modules/image/utils/validate-image-content.util', () => ({
    validateImageContent: jest.fn(),
}));

const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;
const validateImageContentMock = validateImageContent as jest.MockedFunction<
    typeof validateImageContent
>;

const allowedMimeTypes = [...ALLOWED_IMAGE_MIME_TYPES];
const maxSize = DEFAULT_FILE_MAX_SIZE;

function createMulterFile(
    overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
    return {
        fieldname: 'image',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        path: '/tmp/uploads/photo.jpg',
        buffer: Buffer.from('image-bytes'),
        ...overrides,
    } as Express.Multer.File;
}

async function expectImageValidationError(
    run: () => Promise<unknown>,
    message: string,
): Promise<void> {
    await expect(run()).rejects.toMatchObject({
        response: {
            errors: [{ image: [message] }],
        },
    });
}

describe('ImageFileValidationPipe', () => {
    let pipe: ImageFileValidationPipe;

    beforeEach(async () => {
        jest.clearAllMocks();
        unlinkMock.mockResolvedValue(undefined);
        validateImageContentMock.mockResolvedValue(undefined);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ImageFileValidationPipe,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'upload.allowedMimeTypes') {
                                return allowedMimeTypes;
                            }

                            if (key === 'upload.maxSize') {
                                return maxSize;
                            }

                            return undefined;
                        }),
                    },
                },
            ],
        }).compile();

        pipe = module.get(ImageFileValidationPipe);
    });

    describe('transform', () => {
        it('throws when file is missing', async () => {
            await expectImageValidationError(
                () => pipe.transform(undefined),
                'Image file is required',
            );

            expect(unlinkMock).not.toHaveBeenCalled();
            expect(validateImageContentMock).not.toHaveBeenCalled();
        });

        it('throws when declared mimetype is not allowed', async () => {
            const file = createMulterFile({ mimetype: 'application/pdf' });

            await expectImageValidationError(
                () => pipe.transform(file),
                `Invalid image format. Allowed: ${allowedMimeTypes.join(', ')}`,
            );

            expect(unlinkMock).toHaveBeenCalledWith(file.path);
            expect(validateImageContentMock).not.toHaveBeenCalled();
        });

        it('throws when file exceeds max size', async () => {
            const file = createMulterFile({ size: maxSize + 1 });

            await expectImageValidationError(
                () => pipe.transform(file),
                `File is too large. Maximum size is ${maxSize} bytes`,
            );

            expect(unlinkMock).toHaveBeenCalledWith(file.path);
            expect(validateImageContentMock).not.toHaveBeenCalled();
        });

        it('does not enforce max size when config value is falsy', async () => {
            const configService = {
                get: jest.fn((key: string) => {
                    if (key === 'upload.allowedMimeTypes') {
                        return allowedMimeTypes;
                    }

                    if (key === 'upload.maxSize') {
                        return 0;
                    }

                    return undefined;
                }),
            };

            const module = await Test.createTestingModule({
                providers: [
                    ImageFileValidationPipe,
                    { provide: ConfigService, useValue: configService },
                ],
            }).compile();

            const pipeWithoutSizeLimit = module.get(ImageFileValidationPipe);
            const file = createMulterFile({ size: maxSize + 1 });

            await expect(pipeWithoutSizeLimit.transform(file)).resolves.toBe(
                file,
            );
        });

        it('uses default allowed mime types when config does not provide them', async () => {
            const configService = {
                get: jest.fn((key: string) => {
                    if (key === 'upload.maxSize') {
                        return maxSize;
                    }

                    return undefined;
                }),
            };

            const module = await Test.createTestingModule({
                providers: [
                    ImageFileValidationPipe,
                    { provide: ConfigService, useValue: configService },
                ],
            }).compile();

            const pipeWithDefaults = module.get(ImageFileValidationPipe);
            const file = createMulterFile({ mimetype: 'image/avif' });

            await expectImageValidationError(
                () => pipeWithDefaults.transform(file),
                'Invalid image format. Allowed: image/jpeg, image/png, image/webp, image/gif',
            );
        });

        describe('validateImageContent errors', () => {
            it.each([
                ['Invalid or corrupted image file'],
                ['Unable to detect image format from file content'],
                [
                    `Invalid image format. Allowed: ${allowedMimeTypes.join(', ')}`,
                ],
                ['File content does not match declared image type'],
                ['Invalid image file'],
            ])('rethrows "%s" and deletes invalid file', async (message) => {
                const file = createMulterFile();
                validateImageContentMock.mockRejectedValueOnce(
                    new ValidationException({ image: [message] }),
                );

                await expectImageValidationError(
                    () => pipe.transform(file),
                    message,
                );

                expect(validateImageContentMock).toHaveBeenCalledWith(
                    file,
                    allowedMimeTypes,
                );
                expect(unlinkMock).toHaveBeenCalledWith(file.path);
            });
        });

        it('does not delete file when invalid file has no path', async () => {
            const file = createMulterFile({
                path: undefined,
                mimetype: 'application/pdf',
            });

            await expectImageValidationError(
                () => pipe.transform(file),
                `Invalid image format. Allowed: ${allowedMimeTypes.join(', ')}`,
            );

            expect(unlinkMock).not.toHaveBeenCalled();
        });

        it('returns file when validation passes', async () => {
            const file = createMulterFile();

            const result = await pipe.transform(file);

            expect(result).toBe(file);
            expect(validateImageContentMock).toHaveBeenCalledWith(
                file,
                allowedMimeTypes,
            );
            expect(unlinkMock).not.toHaveBeenCalled();
        });
    });
});
