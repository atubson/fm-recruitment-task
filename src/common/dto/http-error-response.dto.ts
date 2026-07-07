import { ApiProperty } from '@nestjs/swagger';

export class HttpErrorResponseDto {
    @ApiProperty({ example: 400 })
    statusCode: number;

    @ApiProperty({ example: 'Validation failed (numeric string is expected)' })
    message: string | string[];

    @ApiProperty({ example: 'Bad Request' })
    error: string;
}
