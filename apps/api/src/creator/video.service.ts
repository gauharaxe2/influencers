import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { UploadSessionDto, VideoDto, VideoUploadInput } from '@creator-platform/contracts';
import { randomBytes } from 'node:crypto';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';
import { CountryPolicyService } from '../common/country-policy.service';
import { toVideoDto } from '../common/dto-mappers';
import { sha256 } from '../common/token-hash';
import type { User } from '../domain/types';
import { FirestoreRepository } from '../firestore/firestore.repository';
import { FirestoreService } from '../firestore/firestore.service';
import { UPLOAD_SESSION_TTL_MS } from '../security/security.constants';
import { generateObjectKey } from '../storage/object-key';
import { StorageObjectNotFoundError } from '../storage/storage-errors';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class VideoService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly repository: FirestoreRepository,
    private readonly countryPolicies: CountryPolicyService,
    private readonly storage: StorageService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async createUploadSession(user: User, input: VideoUploadInput): Promise<UploadSessionDto> {
    await this.countryPolicies.requireCreatorUploads(user.countryCode);
    if (input.sizeBytes > this.config.maxUploadBytes) {
      throw new PayloadTooLargeException('Video exceeds the maximum allowed upload size');
    }

    const token = randomBytes(32).toString('base64url');
    const objectKey = generateObjectKey();
    const expiresAt = new Date(Date.now() + UPLOAD_SESSION_TTL_MS);
    const upload = await this.storage.createUploadUrl({
      objectKey,
      token,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    const video = await this.firestore.runTransaction((transaction) =>
      this.repository.createVideoWithUploadSessionInTransaction(
        transaction,
        {
          ownerId: user.id,
          title: input.title,
          description: input.description,
          visibility: input.visibility,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
        },
        {
          objectKey,
          uploadTokenHash: sha256(token),
          expiresAt,
        },
      ),
    );

    return {
      video: toVideoDto(video),
      uploadUrl: upload.uploadUrl,
      method: 'PUT',
      headers: upload.headers,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async complete(user: User, videoId: string): Promise<VideoDto> {
    const row = await this.repository.findUploadSessionByVideoId(videoId);

    if (!row || row.video.ownerId !== user.id) {
      throw new NotFoundException('Upload not found');
    }

    const { session, video } = row;

    const isAlreadyComplete = video.status === 'UPLOADED' && session.completedAt !== null;
    if (!isAlreadyComplete && (video.status !== 'UPLOADING' || session.completedAt !== null)) {
      throw new ConflictException('Upload cannot be completed');
    }

    let storedSize: number;
    try {
      storedSize = (await this.storage.statObject(session.objectKey)).sizeBytes;
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        throw new ConflictException('Uploaded object is unavailable or incomplete');
      }
      throw error;
    }

    if (storedSize !== video.sizeBytes) {
      throw new UnprocessableEntityException('Uploaded object size does not match the declared size');
    }

    if (isAlreadyComplete) {
      return toVideoDto(video);
    }

    const result = await this.repository.completeUploadInTransaction(session.id, videoId, user.id);
    if (result === 'conflict') {
      const current = await this.repository.findUploadSessionByVideoId(videoId);
      if (current?.session.completedAt && current.video.status === 'UPLOADED') {
        return toVideoDto(current.video);
      }
      throw new ConflictException('Upload cannot be completed');
    }

    return toVideoDto(result);
  }

  async list(userId: string): Promise<{ videos: VideoDto[] }> {
    const videos = await this.repository.listVideosByOwner(userId);
    return { videos: videos.map(toVideoDto) };
  }
}