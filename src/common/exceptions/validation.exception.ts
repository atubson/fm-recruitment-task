import { UnprocessableEntityException } from '@nestjs/common';
import { toValidationErrorResponse } from '../utils/format-validation-errors.util';

export class ValidationException extends UnprocessableEntityException {
    constructor(errors: Record<string, string[]>) {
        super(toValidationErrorResponse(errors));
    }
}
