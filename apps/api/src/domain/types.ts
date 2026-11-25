export type Role = 'VIEWER' | 'CREATOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type PayoutStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED';
export type VideoStatus = 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'READY' | 'REJECTED';
export type VideoVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: Role;
  countryCode: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorProfile {
  id: string;
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  payoutStatus: PayoutStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CountryPolicy {
  id: string;
  signupEnabled: boolean;
  creatorUploadsEnabled: boolean;
  adsEnabled: boolean;
  payoutsEnabled: boolean;
  dataRegion: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  status: VideoStatus;
  visibility: VideoVisibility;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadSession {
  id: string;
  videoId: string;
  objectKey: string;
  uploadTokenHash: string;
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionWithUser {
  session: Session;
  user: User;
}

export interface UploadSessionWithVideo {
  session: UploadSession;
  video: Video;
}