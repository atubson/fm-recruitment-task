var sharpMocks: {
    sharp: jest.Mock;
    resize: jest.Mock;
    webp: jest.Mock;
    toBuffer: jest.Mock;
};

jest.mock('sharp', () => {
    const toBuffer = jest.fn<() => Promise<Buffer>>();
    const webp = jest.fn();
    const resize = jest.fn();
    const sharp = jest.fn();

    toBuffer.mockResolvedValue(Buffer.from('processed-webp'));
    webp.mockReturnValue({ toBuffer });
    resize.mockReturnValue({ webp });

    sharpMocks = { sharp, resize, webp, toBuffer };

    return {
        __esModule: true,
        default: sharp,
    };
});

import { processImageToWebp } from 'src/modules/image/utils/process-image.util';

describe('processImageToWebp', () => {
    const inputBuffer = Buffer.from('input-image');

    beforeEach(() => {
        jest.clearAllMocks();
        sharpMocks.toBuffer.mockResolvedValue(Buffer.from('processed-webp'));
        sharpMocks.webp.mockReturnValue({ toBuffer: sharpMocks.toBuffer });
        sharpMocks.resize.mockReturnValue({ webp: sharpMocks.webp });
        sharpMocks.sharp.mockReturnValue({ resize: sharpMocks.resize });
    });

    it('calls sharp with the input buffer, rotates, resizes, and converts to webp', async () => {
        await processImageToWebp(inputBuffer, 800, 600);

        expect(sharpMocks.sharp).toHaveBeenCalledWith(inputBuffer);
        expect(sharpMocks.resize).toHaveBeenCalledWith(800, 600, {
            fit: 'cover',
        });
        expect(sharpMocks.webp).toHaveBeenCalledWith({ quality: 85 });
    });

    it('returns the buffer from toBuffer', async () => {
        const outputBuffer = Buffer.from('processed-webp');
        sharpMocks.toBuffer.mockResolvedValue(outputBuffer);

        const result = await processImageToWebp(inputBuffer, 320, 240);

        expect(sharpMocks.toBuffer).toHaveBeenCalled();
        expect(result).toBe(outputBuffer);
    });
});
