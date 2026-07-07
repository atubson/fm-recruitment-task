import { ValidationError } from 'class-validator';

export type ValidationErrorItem = Record<string, string[]>;

export interface ValidationErrorResponse {
    errors: ValidationErrorItem[];
}

export function flattenValidationErrors(
    errors: ValidationError[],
    parentPath = '',
): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const error of errors) {
        const field = parentPath
            ? `${parentPath}.${error.property}`
            : error.property;

        if (error.constraints) {
            result[field] = Object.values(error.constraints);
        }

        if (error.children?.length) {
            Object.assign(
                result,
                flattenValidationErrors(error.children, field),
            );
        }
    }

    return result;
}

export function toValidationErrorResponse(
    errors: Record<string, string[]>,
): ValidationErrorResponse {
    return {
        errors: Object.entries(errors).map(([field, messages]) => ({
            [field]: messages,
        })),
    };
}
