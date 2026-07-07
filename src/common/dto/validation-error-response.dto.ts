import { ApiProperty } from '@nestjs/swagger';

export class ValidationErrorResponseDto {
    @ApiProperty({
        type: 'array',
        example: [
            { title: ['title should not be empty'] },
            { image: ['Image file is required'] },
        ],
        description:
            'List of validation errors. Each item is an object with a field name as key and an array of error messages as value.',
    })
    errors: Record<string, string[]>[];
}
