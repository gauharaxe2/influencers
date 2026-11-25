import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';
import { sha256 } from '../common/token-hash';
import { FirestoreRepository } from '../firestore/firestore.repository';
import { isUploadToken } from './object-key';
import { StorageObjectExistsError } from './storage-errors';
import { STORAGE_DRIVER, StorageDriver } from './storage.types';
import type { UploadUrlRequest, UploadUrlResult, StorageObjectSize } from './storage.types';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_DRIVER) private readonly driver: StorageDriver,
    private readonly repository: FirestoreRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  createUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResult> {
    return this.driver.createUploadUrl(request);
  }

  async statObject(objectKey: string): Promise<StorageObjectSize> {
    return this.driver.statObject(objectKey);
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.driver.deleteObject(objectKey);
  }

  async receiveLocalUpload(
    token: string,
    body: Buffer,
    contentLength: number | null,
  ): Promise<void> {
    if (this.config.storageDriver !== 'local') {
      throw new NotFoundException('Upload endpoint not found');
    }
    if (!isUploadToken(token)) {
      throw new NotFoundException('Upload session not found');
    }
    if (
      contentLength === null ||
      !Number.isSafeInteger(contentLength) ||
      contentLength <= 0 ||
      contentLength > this.config.maxUploadBytes ||
      body.length !== contentLength
    ) {
      throw new BadRequestException('Invalid upload content length');
    }

    const row = await this.repository.findUploadSessionByUploadTokenHash(sha256(token));

    if (
      !row ||
      row.session.completedAt !== null ||
      row.session.expiresAt <= new Date() ||
      row.video.status !== 'UPLOADING'
    ) {
      throw new NotFoundException('Upload session not found');
    }
    if (contentLength !== row.video.sizeBytes) {
      throw new BadRequestException('Upload size does not match the declared size');
    }

    try {
      await this.driver.putObject(row.session.objectKey, body);
    } catch (error) {
      if (error instanceof StorageObjectExistsError) {
        throw new ConflictException('Upload has already been received');
      }
      throw error;
    }

    const stored = await this.statObject(row.session.objectKey);
    if (stored.sizeBytes !== row.video.sizeBytes) {
      await this.deleteObject(row.session.objectKey).catch(() => undefined);
      throw new UnprocessableEntityException('Stored upload size does not match the declared size');
    }
  }
}