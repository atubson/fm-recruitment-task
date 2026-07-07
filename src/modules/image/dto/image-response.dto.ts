import { ApiProperty } from '@nestjs/swagger';

export class ImageResponseDto {
    @ApiProperty({ description: 'The ID of the image', example: 1 })
    id: number;

    @ApiProperty({ description: 'The Presigned genereted by S3 service URL of the image', example: 'https://example.com/image.webp' })
    url: string;

    @ApiProperty({ description: 'The title of the image', example: 'My photo' })
    title: string;

    @ApiProperty({ description: 'The width of the image', example: 800 })
    width: number;

    @ApiProperty({ description: 'The height of the image', example: 600 })
    height: number;
}
