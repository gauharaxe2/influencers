import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';
import { StorageObjectNotFoundError } from './storage-errors';
import { StorageDriver } from './storage.types';
import type { UploadUrlRequest, UploadUrlResult } from './storage.types';

const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

@Injectable()
export class S3StorageDriver extends StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super();
    if (
      !config.s3Bucket ||
      !config.s3Region ||
      !config.s3AccessKeyId ||
      !config.s3SecretAccessKey
    ) {
      throw new Error('S3 storage configuration is incomplete');
    }

    this.bucket = config.s3Bucket;
    this.client = new S3Client({
      region: config.s3Region,
      ...(config.s3Endpoint ? { endpoint: config.s3Endpoint } : {}),
      forcePathStyle: config.s3ForcePathStyle || Boolean(config.s3Endpoint),
      credentials: {
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
        ...(config.s3SessionToken ? { sessionToken: config.s3SessionToken } : {}),
      },
    });
  }

  async createUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: request.objectKey,
      ContentType: request.mimeType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });

    return {
      uploadUrl,
      headers: { 'Content-Type': request.mimeType },
    };
  }

  async putObject(objectKey: string, body: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: body,
      }),
    );
  }

  async statObject(objectKey: string): Promise<{ sizeBytes: number }> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      if (
        typeof result.ContentLength !== 'number' ||
        !Number.isSafeInteger(result.ContentLength) ||
        result.ContentLength < 0
      ) {
        throw new Error('Storage service returned an invalid object size');
      }
      return { sizeBytes: result.ContentLength };
    } catch (error) {
      if (this.isMissingObject(error)) {
        throw new StorageObjectNotFoundError();
      }
      throw error;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  private isMissingObject(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = error as {
      name?: unknown;
      $metadata?: { httpStatusCode?: unknown };
    };
    return (
      candidate.name === 'NoSuchKey' ||
      candidate.name === 'NotFound' ||
      candidate.$metadata?.httpStatusCode === 404
    );
  }
}
