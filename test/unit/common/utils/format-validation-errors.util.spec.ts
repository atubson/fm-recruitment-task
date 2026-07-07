import { ValidationError } from 'class-validator';
import {
    flattenValidationErrors,
    toValidationErrorResponse,
} from 'src/common/utils/format-validation-errors.util';

function createValidationError(
    overrides: Partial<ValidationError>,
): ValidationError {
    return {
        property: 'field',
        children: [],
        ...overrides,
    } as ValidationError;
}

describe('flattenValidationErrors', () => {
    it('returns an empty object for no errors', () => {
        expect(flattenValidationErrors([])).toEqual({});
    });

    it('flattens a single field with constraints', () => {
        const errors = [
            createValidationError({
                property: 'title',
                constraints: {
                    isNotEmpty: 'title should not be empty',
                },
            }),
        ];

        expect(flattenValidationErrors(errors)).toEqual({
            title: ['title should not be empty'],
        });
    });

    it('includes all constraint messages for a field', () => {
        const errors = [
            createValidationError({
                property: 'width',
                constraints: {
                    isInt: 'width must be an integer',
                    min: 'width must not be less than 10',
                },
            }),
        ];

        expect(flattenValidationErrors(errors)).toEqual({
            width: ['width must be an integer', 'width must not be less than 10'],
        });
    });

    it('flattens multiple top-level fields', () => {
        const errors = [
            createValidationError({
                property: 'title',
                constraints: { isNotEmpty: 'title should not be empty' },
            }),
            createValidationError({
                property: 'height',
                constraints: { isInt: 'height must be an integer' },
            }),
        ];

        expect(flattenValidationErrors(errors)).toEqual({
            title: ['title should not be empty'],
            height: ['height must be an integer'],
        });
    });

    it('flattens nested children with dot-separated paths', () => {
        const errors = [
            createValidationError({
                property: 'address',
                children: [
                    createValidationError({
                        property: 'city',
                        constraints: { isNotEmpty: 'city should not be empty' },
                    }),
                ],
            }),
        ];

        expect(flattenValidationErrors(errors)).toEqual({
            'address.city': ['city should not be empty'],
        });
    });

    it('flattens deeply nested children', () => {
        const errors = [
            createValidationError({
                property: 'user',
                children: [
                    createValidationError({
                        property: 'profile',
                        children: [
                            createValidationError({
                                property: 'email',
                                constraints: {
                                    isEmail: 'email must be an email',
                                },
                            }),
                        ],
                    }),
                ],
            }),
        ];

        expect(flattenValidationErrors(errors)).toEqual({
            'user.profile.email': ['email must be an email'],
        });
    });

    it('merges parent and nested field errors', () => {
        const errors = [
            createValidationError({
                property: 'title',
                constraints: { isNotEmpty: 'title should not be empty' },
                children: [
                    createValidationError({
                        property: 'meta',
                        constraints: { isString: 'meta must be a string' },
                    }),
                ],
            }),
        ];

        expect(flattenValidationErrors(errors)).toEqual({
            title: ['title should not be empty'],
            'title.meta': ['meta must be a string'],
        });
    });

    it('skips fields without constraints', () => {
        const errors = [
            createValidationError({
                property: 'wrapper',
                children: [
                    createValidationError({
                        property: 'name',
                        constraints: { isNotEmpty: 'name should not be empty' },
                    }),
                ],
            }),
        ];

        expect(flattenValidationErrors(errors)).toEqual({
            'wrapper.name': ['name should not be empty'],
        });
    });
});

describe('toValidationErrorResponse', () => {
    it('returns an empty errors array for no fields', () => {
        expect(toValidationErrorResponse({})).toEqual({
            errors: [],
        });
    });

    it('maps a single field to the API response shape', () => {
        expect(
            toValidationErrorResponse({
                title: ['title should not be empty'],
            }),
        ).toEqual({
            errors: [{ title: ['title should not be empty'] }],
        });
    });

    it('maps multiple fields to separate error items', () => {
        expect(
            toValidationErrorResponse({
                title: ['title should not be empty'],
                width: ['width must be an integer', 'width must not be less than 10'],
            }),
        ).toEqual({
            errors: [
                { title: ['title should not be empty'] },
                {
                    width: [
                        'width must be an integer',
                        'width must not be less than 10',
                    ],
                },
            ],
        });
    });
});
