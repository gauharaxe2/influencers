export interface UploadUrlRequest {
  objectKey: string;
  token: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadUrlResult {
  uploadUrl: string;
  headers: Record<string, string>;
}

export interface StorageObjectSize {
  sizeBytes: number;
}

export abstract class StorageDriver {
  abstract createUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResult>;
  abstract putObject(objectKey: string, body: Buffer): Promise<void>;
  abstract statObject(objectKey: string): Promise<StorageObjectSize>;
  abstract deleteObject(objectKey: string): Promise<void>;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');
