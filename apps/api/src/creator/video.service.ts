import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { UploadSessionDto, VideoDto, VideoUploadInput } from '@creator-platform/contracts';
import type { User } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';
import { CountryPolicyService } from '../common/country-policy.service';
import { toVideoDto } from '../common/dto-mappers';
import { sha256 } from '../common/token-hash';
import { PrismaService } from '../prisma/prisma.service';
import { UPLOAD_SESSION_TTL_MS } from '../security/security.constants';
import { generateObjectKey } from '../storage/object-key';
import { StorageObjectNotFoundError } from '../storage/storage-errors';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class VideoService {
  constructor(
    private readonly prisma: PrismaService,
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

    const video = await this.prisma.$transaction(async (transaction) =>
      transaction.video.create({
        data: {
          ownerId: user.id,
          title: input.title,
          description: input.description,
          visibility: input.visibility,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: BigInt(input.sizeBytes),
          uploadSession: {
            create: {
              objectKey,
              uploadTokenHash: sha256(token),
              expiresAt,
            },
          },
        },
      }),
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
    const session = await this.prisma.uploadSession.findFirst({
      where: {
        videoId,
        expiresAt: { gt: new Date() },
        video: { is: { ownerId: user.id } },
      },
      include: { video: true },
    });

    if (!session) {
      throw new NotFoundException('Upload not found');
    }

    const isAlreadyComplete = session.video.status === 'UPLOADED' && session.completedAt !== null;
    if (!isAlreadyComplete && (session.video.status !== 'UPLOADING' || session.completedAt !== null)) {
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

    if (BigInt(storedSize) !== session.video.sizeBytes) {
      throw new UnprocessableEntityException('Uploaded object size does not match the declared size');
    }

    if (isAlreadyComplete) {
      return toVideoDto(session.video);
    }

    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const claimed = await transaction.uploadSession.updateMany({
        where: {
          id: session.id,
          expiresAt: { gt: now },
          completedAt: null,
        },
        data: { completedAt: now },
      });

      if (claimed.count !== 1) {
        const current = await transaction.uploadSession.findUnique({
          where: { id: session.id },
          include: { video: true },
        });
        if (current?.completedAt && current.video.status === 'UPLOADED') {
          return toVideoDto(current.video);
        }
        throw new ConflictException('Upload cannot be completed');
      }

      const updated = await transaction.video.updateMany({
        where: {
          id: videoId,
          ownerId: user.id,
          status: 'UPLOADING',
        },
        data: { status: 'UPLOADED' },
      });

      if (updated.count !== 1) {
        throw new ConflictException('Upload cannot be completed');
      }

      const video = await transaction.video.findUniqueOrThrow({ where: { id: videoId } });
      return toVideoDto(video);
    });
  }

  async list(userId: string): Promise<{ videos: VideoDto[] }> {
    const videos = await this.prisma.video.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return { videos: videos.map(toVideoDto) };
  }
}
