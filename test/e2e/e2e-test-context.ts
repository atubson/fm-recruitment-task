import { INestApplication } from '@nestjs/common';
import { S3ServiceMock } from '../mocks';

interface E2eTestContext {
    app: INestApplication;
    s3Mock: S3ServiceMock;
}

let context: E2eTestContext | undefined;

export function getE2eApp(): INestApplication {
    if (!context) {
        throw new Error('E2E app is not initialized.');
    }

    return context.app;
}

export function getS3Mock(): S3ServiceMock {
    if (!context) {
        throw new Error('E2E S3 mock is not initialized.');
    }

    return context.s3Mock;
}

export function setE2eContext(next: E2eTestContext): void {
    context = next;
}

export function clearE2eContext(): void {
    context = undefined;
}
