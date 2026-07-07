import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { ValidationException } from '../exceptions/validation.exception';

@Injectable()
export class ImageUploadInterceptor implements NestInterceptor {
    private readonly multerInterceptor: NestInterceptor;

    constructor(private readonly config: ConfigService) {
        const allowedMimeTypes = this.config.get<string[]>(
            'upload.allowedMimeTypes',
        ) ?? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        const InterceptorClass = FileInterceptor('image', {
            storage: diskStorage({
                destination: this.config.get<string>('upload.temporaryFolder')!,
                filename: (_req, file, cb) => {
                    cb(null, `${randomUUID()}-${file.originalname}`);
                },
            }),
            limits: {
                fileSize: Number(this.config.get('upload.maxSize')),
            },
            fileFilter: (_req, file, cb) => {
                if (!allowedMimeTypes.includes(file.mimetype)) {
                    return cb(
                        new ValidationException({
                            image: [
                                `Invalid image format. Allowed: ${allowedMimeTypes.join(', ')}`,
                            ],
                        }),
                        false,
                    );
                }

                cb(null, true);
            },
        });

        this.multerInterceptor = new InterceptorClass();
    }

    intercept(context: ExecutionContext, next: CallHandler) {
        return this.multerInterceptor.intercept(context, next);
    }
}