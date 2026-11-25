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
import { PrismaService } from '../prisma/prisma.service';
import { isUploadToken } from './object-key';
import { StorageObjectExistsError } from './storage-errors';
import { STORAGE_DRIVER, StorageDriver } from './storage.types';
import type { UploadUrlRequest, UploadUrlResult, StorageObjectSize } from './storage.types';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_DRIVER) private readonly driver: StorageDriver,
    private readonly prisma: PrismaService,
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

    const session = await this.prisma.uploadSession.findUnique({
      where: { uploadTokenHash: sha256(token) },
      include: { video: true },
    });

    if (
      !session ||
      session.completedAt !== null ||
      session.expiresAt <= new Date() ||
      session.video.status !== 'UPLOADING'
    ) {
      throw new NotFoundException('Upload session not found');
    }
    if (BigInt(contentLength) !== session.video.sizeBytes) {
      throw new BadRequestException('Upload size does not match the declared size');
    }

    try {
      await this.driver.putObject(session.objectKey, body);
    } catch (error) {
      if (error instanceof StorageObjectExistsError) {
        throw new ConflictException('Upload has already been received');
      }
      throw error;
    }

    const stored = await this.statObject(session.objectKey);
    if (BigInt(stored.sizeBytes) !== session.video.sizeBytes) {
      await this.deleteObject(session.objectKey).catch(() => undefined);
      throw new UnprocessableEntityException('Stored upload size does not match the declared size');
    }
  }
}
