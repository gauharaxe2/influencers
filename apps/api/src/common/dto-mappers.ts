import type { CreatorProfileDto, UserDto, VideoDto } from '@creator-platform/contracts';
import type { CreatorProfile, User, Video } from '../domain/types';

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    countryCode: user.countryCode,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toCreatorProfileDto(profile: CreatorProfile): CreatorProfileDto {
  return {
    id: profile.id,
    userId: profile.userId,
    handle: profile.handle,
    displayName: profile.displayName,
    bio: profile.bio,
    payoutStatus: profile.payoutStatus,
    createdAt: profile.createdAt.toISOString(),
  };
}

export function toVideoDto(video: Video): VideoDto {
  const sizeBytes = video.sizeBytes;
  if (!Number.isSafeInteger(sizeBytes)) {
    throw new Error('Video size exceeds the supported DTO range');
  }

  return {
    id: video.id,
    ownerId: video.ownerId,
    title: video.title,
    description: video.description,
    status: video.status,
    visibility: video.visibility,
    fileName: video.fileName,
    mimeType: video.mimeType,
    sizeBytes,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
  };
}