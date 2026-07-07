import { readFile } from 'fs/promises';
import { ValidationException } from 'src/common/exceptions/validation.exception';
import { validateImageContent } from 'src/modules/image/utils/validate-image-content.util';

jest.mock('fs/promises', () => ({
    readFile: jest.fn(),
}));

var sharpMocks: {
    sharp: jest.Mock;
    metadata: jest.Mock;
};

jest.mock('sharp', () => {
    const metadata = jest.fn();
    const sharp = jest.fn();

    metadata.mockResolvedValue({ format: 'jpeg' });
    sharp.mockReturnValue({ metadata });

    sharpMocks = { sharp, metadata };

    return {
        __esModule: true,
        default: sharp,
    };
});

const readFileMock = readFile as jest.MockedFunction<typeof readFile>;

const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
];

function createMulterFile(
    overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
    return {
        fieldname: 'image',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('image-bytes'),
        ...overrides,
    } as Express.Multer.File;
}

async function expectImageValidationError(
    run: () => Promise<void>,
    message: string,
): Promise<void> {
  try {
    await run();
    throw new Error('Expected ValidationException to be thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationException);
    expect((error as ValidationException).getResponse()).toEqual({
      errors: [{ image: [message] }],
    });
  }
}

describe('validateImageContent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sharpMocks.metadata.mockResolvedValue({ format: 'jpeg' });
        sharpMocks.sharp.mockReturnValue({ metadata: sharpMocks.metadata });
        readFileMock.mockResolvedValue(Buffer.from('file-bytes'));
    });

    describe('resolveFileInput', () => {
        it('uses file buffer when present', async () => {
            const file = createMulterFile({
                buffer: Buffer.from('buffer-bytes'),
            });

            await validateImageContent(file, allowedMimeTypes);

            expect(sharpMocks.sharp).toHaveBeenCalledWith(
                file.buffer,
                { failOn: 'error' },
            );
            expect(readFileMock).not.toHaveBeenCalled();
        });

        it('reads from file path when buffer is missing', async () => {
            const file = createMulterFile({
                buffer: undefined,
                path: '/tmp/uploads/photo.jpg',
            });

            await validateImageContent(file, allowedMimeTypes);

            expect(readFileMock).toHaveBeenCalledWith('/tmp/uploads/photo.jpg');
            expect(sharpMocks.sharp).toHaveBeenCalledWith(
                Buffer.from('file-bytes'),
                { failOn: 'error' },
            );
        });

        it('reads from file path when buffer is empty', async () => {
            const file = createMulterFile({
                buffer: Buffer.alloc(0),
                path: '/tmp/uploads/photo.jpg',
            });

            await validateImageContent(file, allowedMimeTypes);

            expect(readFileMock).toHaveBeenCalledWith('/tmp/uploads/photo.jpg');
        });

        it('throws when buffer and path are missing', async () => {
            const file = createMulterFile({
                buffer: undefined,
                path: undefined,
            });

            await expectImageValidationError(
                () => validateImageContent(file, allowedMimeTypes),
                'Invalid image file',
            );
            expect(sharpMocks.sharp).not.toHaveBeenCalled();
        });
    });

    describe('sharp metadata validation', () => {
        it('throws when sharp fails to read metadata', async () => {
            sharpMocks.metadata.mockRejectedValue(new Error('corrupt'));

            await expectImageValidationError(
                () =>
                    validateImageContent(
                        createMulterFile(),
                        allowedMimeTypes,
                    ),
                'Invalid or corrupted image file',
            );
            expect(sharpMocks.sharp).toHaveBeenCalledWith(
                expect.any(Buffer),
                { failOn: 'error' },
            );
        });

        it('throws when image format cannot be detected', async () => {
            sharpMocks.metadata.mockResolvedValue({ format: undefined });

            await expectImageValidationError(
                () =>
                    validateImageContent(
                        createMulterFile(),
                        allowedMimeTypes,
                    ),
                'Unable to detect image format from file content',
            );
        });

        it('throws when detected format is not allowed', async () => {
            sharpMocks.metadata.mockResolvedValue({ format: 'tiff' });

            await expectImageValidationError(
                () =>
                    validateImageContent(
                        createMulterFile(),
                        allowedMimeTypes,
                    ),
                `Invalid image format. Allowed: ${allowedMimeTypes.join(', ')}`,
            );
        });

        it('throws when detected format is allowed but not in allowedMimeTypes list', async () => {
            sharpMocks.metadata.mockResolvedValue({ format: 'png' });

            await expectImageValidationError(
                () =>
                    validateImageContent(createMulterFile(), ['image/jpeg']),
                'Invalid image format. Allowed: image/jpeg',
            );
        });

        it('throws when declared mimetype does not match detected content', async () => {
            sharpMocks.metadata.mockResolvedValue({ format: 'jpeg' });

            await expectImageValidationError(
                () =>
                    validateImageContent(
                        createMulterFile({ mimetype: 'image/png' }),
                        allowedMimeTypes,
                    ),
                'File content does not match declared image type',
            );
        });
    });

    describe('successful validation', () => {
        it.each([
            ['jpeg', 'image/jpeg'],
            ['png', 'image/png'],
            ['webp', 'image/webp'],
            ['gif', 'image/gif'],
            ['avif', 'image/avif'],
        ] as const)(
            'passes for %s content with matching mimetype',
            async (format, mimetype) => {
                sharpMocks.metadata.mockResolvedValue({ format });

                await expect(
                    validateImageContent(
                        createMulterFile({ mimetype }),
                        allowedMimeTypes,
                    ),
                ).resolves.toBeUndefined();

                expect(sharpMocks.metadata).toHaveBeenCalled();
            },
        );
    });
});
