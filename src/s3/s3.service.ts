import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface S3UploadResult {
  /** Object key within the bucket — store this in DB to build URLs later */
  key: string;
}

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.getOrThrow<string>('s3.region');
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('s3.accessKeyId'),
        secretAccessKey: this.config.getOrThrow<string>('s3.secretAccessKey'),
      },
    });
    this.bucket = this.config.getOrThrow<string>('s3.bucket');
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<S3UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return { key };
  }

  getObjectUrl(key: string): string {
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodedKey}`;
  }
}