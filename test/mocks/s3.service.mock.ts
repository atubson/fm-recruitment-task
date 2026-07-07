import { S3Service, S3UploadResult } from '../../src/modules/s3/s3.service';

export interface StoredS3Object {
    body: Buffer;
    contentType: string;
}

export interface S3ServiceMockOptions {
    signedUrlPrefix?: string;
}

export interface S3ServiceMock {
    upload: jest.Mock<Promise<S3UploadResult>, [string, Buffer, string]>;
    download: jest.Mock<Promise<Buffer>, [string]>;
    delete: jest.Mock<Promise<void>, [string]>;
    getSignedObjectUrl: jest.Mock<Promise<string>, [string]>;
    store: Map<string, StoredS3Object>;
    reset: () => void;
    asProvider: () => { provide: typeof S3Service; useValue: S3ServiceMock };
}

export function createS3ServiceMock(
    options: S3ServiceMockOptions = {},
): S3ServiceMock {
    const signedUrlPrefix =
        options.signedUrlPrefix ?? 'https://signed.test.example';
    const store = new Map<string, StoredS3Object>();

    const upload = jest.fn(
        async (
            key: string,
            body: Buffer,
            contentType: string,
        ): Promise<S3UploadResult> => {
            store.set(key, { body, contentType });
            return { key };
        },
    );

    const download = jest.fn(async (key: string): Promise<Buffer> => {
        const object = store.get(key);

        if (!object) {
            throw new Error(`S3 object not found: ${key}`);
        }

        return object.body;
    });

    const deleteObject = jest.fn(async (key: string): Promise<void> => {
        store.delete(key);
    });

    const getSignedObjectUrl = jest.fn(
        async (key: string): Promise<string> =>
            `${signedUrlPrefix}/${key}?expires=3600`,
    );

    const reset = (): void => {
        store.clear();
        upload.mockClear();
        download.mockClear();
        deleteObject.mockClear();
        getSignedObjectUrl.mockClear();
    };

    const mock: S3ServiceMock = {
        upload,
        download,
        delete: deleteObject,
        getSignedObjectUrl,
        store,
        reset,
        asProvider: () => ({
            provide: S3Service,
            useValue: mock,
        }),
    };

    return mock;
}
