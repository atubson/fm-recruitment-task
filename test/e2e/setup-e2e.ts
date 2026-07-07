import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { ValidationException } from '../../src/common/exceptions/validation.exception';
import { ValidationExceptionFilter } from '../../src/common/filters/validation-exception.filter';
import { flattenValidationErrors } from '../../src/common/utils/format-validation-errors.util';
import { S3Service } from '../../src/modules/s3/s3.service';
import { createS3ServiceMock } from '../mocks';
import {
    clearE2eContext,
    setE2eContext,
} from './e2e-test-context';
import { truncateTables } from './helpers/database.helper';
import {
    cleanUploadTempDir,
    ensureUploadTempDir,
} from './helpers/upload-temp.helper';

const s3Mock = createS3ServiceMock();
let app: INestApplication | undefined;

ensureUploadTempDir();

function configureE2eApp(application: INestApplication): void {
    application.useGlobalFilters(new ValidationExceptionFilter());
    application.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            exceptionFactory: (errors) =>
                new ValidationException(flattenValidationErrors(errors)),
        }),
    );
}

beforeEach(async () => {
    s3Mock.reset();
    cleanUploadTempDir();

    const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(S3Service)
        .useValue(s3Mock)
        .compile();

    app = moduleFixture.createNestApplication();
    configureE2eApp(app);
    app.enableShutdownHooks();
    await app.init();

    await truncateTables(app.get(DataSource));
    setE2eContext({ app, s3Mock });
});

afterEach(async () => {
    await app?.close();
    app = undefined;
    clearE2eContext();
    cleanUploadTempDir();
});
