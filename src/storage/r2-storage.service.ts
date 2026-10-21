import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface StoredObject {
  body: string;
  contentType: string;
  sizeBytes: number;
}

function isMissingObjectError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    candidate.name === 'NoSuchKey' ||
    candidate.name === 'NotFound' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException('Object storage is not configured');
    }
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
    return this.client;
  }

  private getBucket(): string {
    const bucket = this.config.get<string>('R2_BUCKET_NAME');
    if (!bucket) {
      throw new ServiceUnavailableException('Object storage is not configured');
    }
    return bucket;
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObject(key: string): Promise<StoredObject> {
    try {
      const response = await this.getClient().send(
        new GetObjectCommand({ Bucket: this.getBucket(), Key: key }),
      );
      if (!response.Body) {
        throw new NotFoundException('Document not found');
      }
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      return {
        body: buffer.toString('utf-8'),
        contentType: response.ContentType ?? 'text/markdown; charset=utf-8',
        sizeBytes: response.ContentLength ?? buffer.byteLength,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (isMissingObjectError(error)) {
        throw new NotFoundException('Document not found');
      }
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.getClient().send(
        new DeleteObjectCommand({ Bucket: this.getBucket(), Key: key }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to delete object ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
