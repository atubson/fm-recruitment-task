import { applyDecorators } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { HttpErrorResponseDto } from '../dto/http-error-response.dto';
import { ValidationErrorResponseDto } from '../dto/validation-error-response.dto';

export const ApiValidationErrorResponse = () =>
    ApiUnprocessableEntityResponse({
        description: 'Validation failed',
        type: ValidationErrorResponseDto,
    });

export const ApiBadRequestErrorResponse = (description = 'Invalid request') =>
    ApiBadRequestResponse({
        description,
        type: HttpErrorResponseDto,
    });

export const ApiNotFoundErrorResponse = (description = 'Resource not found') =>
    ApiNotFoundResponse({
        description,
        type: HttpErrorResponseDto,
    });

export const ApiImageIdParamErrors = () =>
    applyDecorators(
        ApiBadRequestErrorResponse('Invalid image id'),
        ApiNotFoundErrorResponse('Image not found'),
    );
