import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { access, link, mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';
import { StorageObjectExistsError, StorageObjectNotFoundError } from './storage-errors';
import { StorageDriver } from './storage.types';
import type { UploadUrlRequest, UploadUrlResult } from './storage.types';

const OBJECT_KEY_PATTERN = /^uploads\/[a-f0-9-]{36}\/[a-f0-9]{32}$/;

@Injectable()
export class LocalStorageDriver extends StorageDriver {
  private readonly root: string;
  private readonly publicApiUrl: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super();
    this.root = path.resolve(config.localStorageDir);
    this.publicApiUrl = config.publicApiUrl.replace(/\/+$/, '');
  }

  async createUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResult> {
    return {
      uploadUrl: `${this.publicApiUrl}/api/v1/storage/uploads/${encodeURIComponent(request.token)}`,
      headers: { 'Content-Type': request.mimeType },
    };
  }

  async putObject(objectKey: string, body: Buffer): Promise<void> {
    const objectPath = this.objectPath(objectKey);
    await mkdir(path.dirname(objectPath), { recursive: true });

    const temporaryPath = path.join(
      path.dirname(objectPath),
      `.${randomBytes(16).toString('hex')}.tmp`,
    );

    try {
      await writeFile(temporaryPath, body, { flag: 'wx' });
      await link(temporaryPath, objectPath);
    } catch (error) {
      if (this.errorCode(error) === 'EEXIST') {
        throw new StorageObjectExistsError();
      }
      throw error;
    } finally {
      await unlink(temporaryPath).catch(() => undefined);
    }
  }

  async statObject(objectKey: string): Promise<{ sizeBytes: number }> {
    const objectPath = this.objectPath(objectKey);
    try {
      await access(objectPath, constants.R_OK);
      const information = await stat(objectPath);
      if (!information.isFile() || !Number.isSafeInteger(information.size)) {
        throw new StorageObjectNotFoundError();
      }
      return { sizeBytes: information.size };
    } catch (error) {
      if (this.errorCode(error) === 'ENOENT' || error instanceof StorageObjectNotFoundError) {
        throw new StorageObjectNotFoundError();
      }
      throw error;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await unlink(this.objectPath(objectKey)).catch((error: unknown) => {
      if (this.errorCode(error) !== 'ENOENT') {
        throw error;
      }
    });
  }

  private objectPath(objectKey: string): string {
    if (!OBJECT_KEY_PATTERN.test(objectKey)) {
      throw new Error('Invalid storage object key');
    }

    const resolved = path.resolve(this.root, objectKey);
    if (!resolved.startsWith(`${this.root}${path.sep}`)) {
      throw new Error('Storage object key escapes the storage root');
    }
    return resolved;
  }

  private errorCode(error: unknown): string | null {
    return typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : null;
  }
}
