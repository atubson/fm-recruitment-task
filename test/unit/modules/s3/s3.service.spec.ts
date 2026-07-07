var awsMocks: {
    send: jest.Mock;
    PutObjectCommand: jest.Mock;
    GetObjectCommand: jest.Mock;
    DeleteObjectCommand: jest.Mock;
    S3Client: jest.Mock;
    getSignedUrl: jest.Mock;
};

jest.mock('@aws-sdk/client-s3', () => {
    const send = jest.fn();
    const PutObjectCommand = jest.fn((input: unknown) => ({
        input,
        _type: 'PutObjectCommand',
    }));
    const GetObjectCommand = jest.fn((input: unknown) => ({
        input,
        _type: 'GetObjectCommand',
    }));
    const DeleteObjectCommand = jest.fn((input: unknown) => ({
        input,
        _type: 'DeleteObjectCommand',
    }));
    const S3Client = jest.fn(() => ({ send }));

    awsMocks = {
        send,
        PutObjectCommand,
        GetObjectCommand,
        DeleteObjectCommand,
        S3Client,
        getSignedUrl: jest.fn(),
    };

    return {
        S3Client,
        PutObjectCommand,
        GetObjectCommand,
        DeleteObjectCommand,
    };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: (...args: unknown[]) => awsMocks.getSignedUrl(...args),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from 'src/modules/s3/s3.service';

describe('S3Service', () => {
    let service: S3Service;

    const bucket = 'test-bucket';
    const signedUrlExpiresIn = 7200;

    beforeEach(async () => {
        jest.clearAllMocks();

        awsMocks.getSignedUrl.mockResolvedValue(
            'https://signed.test.example/object?expires=7200',
        );
        awsMocks.send.mockResolvedValue({
            Body: {
                transformToByteArray: jest
                    .fn()
                    .mockResolvedValue(Uint8Array.from([1, 2, 3])),
            },
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                S3Service,
                {
                    provide: ConfigService,
                    useValue: {
                        getOrThrow: jest.fn((key: string) => {
                            const values: Record<string, string> = {
                                's3.region': 'eu-north-1',
                                's3.accessKeyId': 'test-access-key',
                                's3.secretAccessKey': 'test-secret-key',
                                's3.bucket': bucket,
                            };

                            return values[key];
                        }),
                        get: jest.fn((key: string) => {
                            if (key === 's3.signedUrlExpiresIn') {
                                return signedUrlExpiresIn;
                            }

                            return undefined;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get(S3Service);
    });

    it('creates S3 client with config credentials', () => {
        expect(awsMocks.S3Client).toHaveBeenCalledWith({
            region: 'eu-north-1',
            credentials: {
                accessKeyId: 'test-access-key',
                secretAccessKey: 'test-secret-key',
            },
        });
    });

    describe('upload', () => {
        it('sends PutObjectCommand with bucket, key, body, and content type', async () => {
            const body = Buffer.from('image-bytes');
            const key = 'tmp/photo.jpg';

            const result = await service.upload(key, body, 'image/jpeg');

            expect(awsMocks.PutObjectCommand).toHaveBeenCalledWith({
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: 'image/jpeg',
            });
            expect(awsMocks.send).toHaveBeenCalledWith(
                expect.objectContaining({ _type: 'PutObjectCommand' }),
            );
            expect(result).toEqual({ key });
        });
    });

    describe('download', () => {
        it('sends GetObjectCommand with bucket and key', async () => {
            const key = 'images/photo.webp';

            const result = await service.download(key);

            expect(awsMocks.GetObjectCommand).toHaveBeenCalledWith({
                Bucket: bucket,
                Key: key,
            });
            expect(awsMocks.send).toHaveBeenCalledWith(
                expect.objectContaining({ _type: 'GetObjectCommand' }),
            );
            expect(result).toEqual(Buffer.from([1, 2, 3]));
        });

        it('throws when S3 response has no body', async () => {
            awsMocks.send.mockResolvedValueOnce({ Body: undefined });

            await expect(service.download('missing.webp')).rejects.toThrow(
                'S3 object not found: missing.webp',
            );
        });
    });

    describe('delete', () => {
        it('sends DeleteObjectCommand with bucket and key', async () => {
            const key = 'tmp/photo.jpg';

            await service.delete(key);

            expect(awsMocks.DeleteObjectCommand).toHaveBeenCalledWith({
                Bucket: bucket,
                Key: key,
            });
            expect(awsMocks.send).toHaveBeenCalledWith(
                expect.objectContaining({ _type: 'DeleteObjectCommand' }),
            );
        });
    });

    describe('getSignedObjectUrl', () => {
        it('calls getSignedUrl with GetObjectCommand and expiry from config', async () => {
            const key = 'images/photo.webp';
            const clientInstance = awsMocks.S3Client.mock.results[0].value;

            const result = await service.getSignedObjectUrl(key);

            expect(awsMocks.GetObjectCommand).toHaveBeenCalledWith({
                Bucket: bucket,
                Key: key,
            });
            expect(awsMocks.getSignedUrl).toHaveBeenCalledWith(
                clientInstance,
                expect.objectContaining({ _type: 'GetObjectCommand' }),
                { expiresIn: signedUrlExpiresIn },
            );
            expect(result).toBe(
                'https://signed.test.example/object?expires=7200',
            );
        });
    });
});
