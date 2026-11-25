import type { Timestamp } from 'firebase-admin/firestore';
import type {
  CountryPolicy,
  CreatorProfile,
  Session,
  UploadSession,
  User,
  Video,
} from '../domain/types';

function toDate(value: Timestamp | Date | undefined | null): Date {
  if (!value) {
    return new Date(0);
  }
  if (value instanceof Date) {
    return value;
  }
  return value.toDate();
}

function optionalDate(value: Timestamp | Date | undefined | null): Date | null {
  if (value === undefined || value === null) {
    return null;
  }
  return toDate(value);
}

export function userFromDoc(id: string, data: FirebaseFirestore.DocumentData): User {
  return {
    id,
    email: data.email as string,
    passwordHash: data.passwordHash as string,
    displayName: data.displayName as string,
    role: data.role as User['role'],
    countryCode: data.countryCode as string,
    status: data.status as User['status'],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function sessionFromDoc(id: string, data: FirebaseFirestore.DocumentData): Session {
  return {
    id,
    userId: data.userId as string,
    refreshTokenHash: data.refreshTokenHash as string,
    expiresAt: toDate(data.expiresAt),
    revokedAt: optionalDate(data.revokedAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function creatorProfileFromDoc(id: string, data: FirebaseFirestore.DocumentData): CreatorProfile {
  return {
    id: data.id as string,
    userId: data.userId as string,
    handle: data.handle as string,
    displayName: data.displayName as string,
    bio: (data.bio as string) ?? '',
    payoutStatus: data.payoutStatus as CreatorProfile['payoutStatus'],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function countryPolicyFromDoc(id: string, data: FirebaseFirestore.DocumentData): CountryPolicy {
  return {
    id,
    signupEnabled: data.signupEnabled as boolean,
    creatorUploadsEnabled: data.creatorUploadsEnabled as boolean,
    adsEnabled: data.adsEnabled as boolean,
    payoutsEnabled: data.payoutsEnabled as boolean,
    dataRegion: (data.dataRegion as string) ?? 'global',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function videoFromDoc(id: string, data: FirebaseFirestore.DocumentData): Video {
  const sizeBytes = data.sizeBytes as number;
  return {
    id,
    ownerId: data.ownerId as string,
    title: data.title as string,
    description: data.description as string,
    status: data.status as Video['status'],
    visibility: data.visibility as Video['visibility'],
    fileName: data.fileName as string,
    mimeType: data.mimeType as string,
    sizeBytes,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function uploadSessionFromDoc(id: string, data: FirebaseFirestore.DocumentData): UploadSession {
  return {
    id,
    videoId: data.videoId as string,
    objectKey: data.objectKey as string,
    uploadTokenHash: data.uploadTokenHash as string,
    expiresAt: toDate(data.expiresAt),
    completedAt: optionalDate(data.completedAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}