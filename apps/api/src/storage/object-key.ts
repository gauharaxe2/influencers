import { randomBytes, randomUUID } from 'node:crypto';

export function generateObjectKey(): string {
  return `uploads/${randomUUID()}/${randomBytes(16).toString('hex')}`;
}

export function isUploadToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
