import { Injectable } from '@nestjs/common';
import type { Transaction } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import type {
  CountryPolicy,
  CreatorProfile,
  Role,
  Session,
  SessionWithUser,
  UploadSession,
  UploadSessionWithVideo,
  User,
  UserStatus,
  Video,
  VideoStatus,
  VideoVisibility,
} from '../domain/types';
import { UniqueViolationError } from '../common/unique-violation';
import { COLLECTIONS, normalizeEmail } from './collections';
import {
  countryPolicyFromDoc,
  creatorProfileFromDoc,
  sessionFromDoc,
  uploadSessionFromDoc,
  userFromDoc,
  videoFromDoc,
} from './converters';
import { FirestoreService } from './firestore.service';

@Injectable()
export class FirestoreRepository {
  constructor(private readonly firestoreService: FirestoreService) {}

  private get db() {
    return this.firestoreService.firestore;
  }

  private ts(date: Date) {
    return FirestoreService.timestampFromDate(date);
  }

  async findUserById(id: string): Promise<User | null> {
    const snap = await this.db.collection(COLLECTIONS.users).doc(id).get();
    if (!snap.exists) {
      return null;
    }
    return userFromDoc(snap.id, snap.data()!);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email);
    const emailSnap = await this.db.collection(COLLECTIONS.userEmails).doc(normalized).get();
    if (!emailSnap.exists) {
      return null;
    }
    const userId = emailSnap.data()!.userId as string;
    return this.findUserById(userId);
  }

  async findCountryPolicy(id: string): Promise<CountryPolicy | null> {
    const snap = await this.db.collection(COLLECTIONS.countryPolicies).doc(id).get();
    if (!snap.exists) {
      return null;
    }
    return countryPolicyFromDoc(snap.id, snap.data()!);
  }

  async findCreatorProfileByUserId(userId: string): Promise<CreatorProfile | null> {
    const snap = await this.db.collection(COLLECTIONS.creatorProfiles).doc(userId).get();
    if (!snap.exists) {
      return null;
    }
    return creatorProfileFromDoc(snap.id, snap.data()!);
  }

  async findCreatorProfileByHandle(handle: string): Promise<CreatorProfile | null> {
    const handleSnap = await this.db.collection(COLLECTIONS.creatorHandles).doc(handle).get();
    if (!handleSnap.exists) {
      return null;
    }
    const userId = handleSnap.data()!.userId as string;
    return this.findCreatorProfileByUserId(userId);
  }

  async findSessionByRefreshTokenHash(refreshTokenHash: string): Promise<SessionWithUser | null> {
    const tokenSnap = await this.db.collection(COLLECTIONS.sessionTokens).doc(refreshTokenHash).get();
    if (!tokenSnap.exists) {
      return null;
    }
    const sessionId = tokenSnap.data()!.sessionId as string;
    const sessionSnap = await this.db.collection(COLLECTIONS.sessions).doc(sessionId).get();
    if (!sessionSnap.exists) {
      return null;
    }
    const session = sessionFromDoc(sessionSnap.id, sessionSnap.data()!);
    const user = await this.findUserById(session.userId);
    if (!user) {
      return null;
    }
    return { session, user };
  }

  async findUploadSessionByUploadTokenHash(hash: string): Promise<UploadSessionWithVideo | null> {
    const tokenSnap = await this.db.collection(COLLECTIONS.uploadTokens).doc(hash).get();
    if (!tokenSnap.exists) {
      return null;
    }
    const sessionId = tokenSnap.data()!.sessionId as string;
    const sessionSnap = await this.db.collection(COLLECTIONS.uploadSessions).doc(sessionId).get();
    if (!sessionSnap.exists) {
      return null;
    }
    const session = uploadSessionFromDoc(sessionSnap.id, sessionSnap.data()!);
    const videoSnap = await this.db.collection(COLLECTIONS.videos).doc(session.videoId).get();
    if (!videoSnap.exists) {
      return null;
    }
    const video = videoFromDoc(videoSnap.id, videoSnap.data()!);
    return { session, video };
  }

  async findUploadSessionByVideoId(videoId: string): Promise<UploadSessionWithVideo | null> {
    const query = await this.db
      .collection(COLLECTIONS.uploadSessions)
      .where('videoId', '==', videoId)
      .limit(1)
      .get();
    if (query.empty) {
      return null;
    }
    const sessionDoc = query.docs[0]!;
    const session = uploadSessionFromDoc(sessionDoc.id, sessionDoc.data());
    const video = await this.findVideoById(session.videoId);
    if (!video) {
      return null;
    }
    return { session, video };
  }

  async findVideoById(id: string): Promise<Video | null> {
    const snap = await this.db.collection(COLLECTIONS.videos).doc(id).get();
    if (!snap.exists) {
      return null;
    }
    return videoFromDoc(snap.id, snap.data()!);
  }

  async listVideosByOwner(ownerId: string): Promise<Video[]> {
    const query = await this.db
      .collection(COLLECTIONS.videos)
      .where('ownerId', '==', ownerId)
      .orderBy('createdAt', 'desc')
      .get();
    return query.docs.map((doc) => videoFromDoc(doc.id, doc.data()));
  }

  async isHandleTaken(tx: Transaction, handle: string): Promise<boolean> {
    const snap = await tx.get(this.db.collection(COLLECTIONS.creatorHandles).doc(handle));
    return snap.exists;
  }

  async createUserInTransaction(
    tx: Transaction,
    data: {
      email: string;
      passwordHash: string;
      displayName: string;
      countryCode: string;
      role: Role;
    },
  ): Promise<User> {
    const now = new Date();
    const id = randomUUID();
    const normalized = normalizeEmail(data.email);
    const emailRef = this.db.collection(COLLECTIONS.userEmails).doc(normalized);
    const emailSnap = await tx.get(emailRef);
    if (emailSnap.exists) {
      throw new UniqueViolationError('email');
    }

    const user: User = {
      id,
      email: normalized,
      passwordHash: data.passwordHash,
      displayName: data.displayName,
      role: data.role,
      countryCode: data.countryCode,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    tx.set(this.db.collection(COLLECTIONS.users).doc(id), {
      email: user.email,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
      role: user.role,
      countryCode: user.countryCode,
      status: user.status,
      createdAt: this.ts(now),
      updatedAt: this.ts(now),
    });
    tx.set(emailRef, { userId: id });

    return user;
  }

  async createCreatorProfileInTransaction(
    tx: Transaction,
    data: { userId: string; handle: string; displayName: string },
  ): Promise<CreatorProfile> {
    const now = new Date();
    const profileId = randomUUID();
    const handleRef = this.db.collection(COLLECTIONS.creatorHandles).doc(data.handle);
    const handleSnap = await tx.get(handleRef);
    if (handleSnap.exists) {
      throw new UniqueViolationError('handle');
    }

    const profileRef = this.db.collection(COLLECTIONS.creatorProfiles).doc(data.userId);
    const existing = await tx.get(profileRef);
    if (existing.exists) {
      throw new UniqueViolationError('userId');
    }

    const profile: CreatorProfile = {
      id: profileId,
      userId: data.userId,
      handle: data.handle,
      displayName: data.displayName,
      bio: '',
      payoutStatus: 'UNVERIFIED',
      createdAt: now,
      updatedAt: now,
    };

    tx.set(profileRef, {
      id: profileId,
      userId: data.userId,
      handle: data.handle,
      displayName: data.displayName,
      bio: '',
      payoutStatus: 'UNVERIFIED',
      createdAt: this.ts(now),
      updatedAt: this.ts(now),
    });
    tx.set(handleRef, { userId: data.userId, profileId });

    return profile;
  }

  async createSessionInTransaction(
    tx: Transaction,
    data: { id: string; userId: string; refreshTokenHash: string; expiresAt: Date },
  ): Promise<Session> {
    const now = new Date();
    const tokenRef = this.db.collection(COLLECTIONS.sessionTokens).doc(data.refreshTokenHash);
    const tokenSnap = await tx.get(tokenRef);
    if (tokenSnap.exists) {
      throw new UniqueViolationError('refreshTokenHash');
    }

    const session: Session = {
      id: data.id,
      userId: data.userId,
      refreshTokenHash: data.refreshTokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(this.db.collection(COLLECTIONS.sessions).doc(data.id), {
      userId: data.userId,
      refreshTokenHash: data.refreshTokenHash,
      expiresAt: this.ts(data.expiresAt),
      revokedAt: null,
      createdAt: this.ts(now),
      updatedAt: this.ts(now),
    });
    tx.set(tokenRef, { sessionId: data.id });

    return session;
  }

  async revokeSessionInTransaction(tx: Transaction, sessionId: string, refreshTokenHash: string): Promise<boolean> {
    const sessionRef = this.db.collection(COLLECTIONS.sessions).doc(sessionId);
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) {
      return false;
    }
    const data = sessionSnap.data()!;
    const expiresAt = (data.expiresAt as FirebaseFirestore.Timestamp).toDate();
    const revokedAt = data.revokedAt;
    if (revokedAt !== null && revokedAt !== undefined) {
      return false;
    }
    if (expiresAt <= new Date()) {
      return false;
    }
    if (data.refreshTokenHash !== refreshTokenHash) {
      return false;
    }

    const now = new Date();
    tx.update(sessionRef, {
      revokedAt: this.ts(now),
      updatedAt: this.ts(now),
    });
    return true;
  }

  async revokeSessionsByRefreshTokenHash(refreshTokenHash: string): Promise<void> {
    const tokenSnap = await this.db.collection(COLLECTIONS.sessionTokens).doc(refreshTokenHash).get();
    if (!tokenSnap.exists) {
      return;
    }
    const sessionId = tokenSnap.data()!.sessionId as string;
    const sessionRef = this.db.collection(COLLECTIONS.sessions).doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return;
    }
    const data = sessionSnap.data()!;
    if (data.revokedAt !== null && data.revokedAt !== undefined) {
      return;
    }
    const now = new Date();
    await sessionRef.update({
      revokedAt: this.ts(now),
      updatedAt: this.ts(now),
    });
  }

  async upgradeUserToCreatorInTransaction(tx: Transaction, userId: string): Promise<User> {
    const userRef = this.db.collection(COLLECTIONS.users).doc(userId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new Error('User not found');
    }
    const user = userFromDoc(userSnap.id, userSnap.data()!);
    if (user.role === 'VIEWER' && user.status === 'ACTIVE') {
      const now = new Date();
      tx.update(userRef, { role: 'CREATOR', updatedAt: this.ts(now) });
      return { ...user, role: 'CREATOR', updatedAt: now };
    }
    return user;
  }

  async getUserInTransaction(tx: Transaction, userId: string): Promise<User | null> {
    const snap = await tx.get(this.db.collection(COLLECTIONS.users).doc(userId));
    if (!snap.exists) {
      return null;
    }
    return userFromDoc(snap.id, snap.data()!);
  }

  async getCreatorProfileInTransaction(tx: Transaction, userId: string): Promise<CreatorProfile | null> {
    const snap = await tx.get(this.db.collection(COLLECTIONS.creatorProfiles).doc(userId));
    if (!snap.exists) {
      return null;
    }
    return creatorProfileFromDoc(snap.id, snap.data()!);
  }

  async updateCreatorProfile(
    userId: string,
    data: { displayName: string; handle: string; bio: string },
  ): Promise<CreatorProfile> {
    return this.firestoreService.runTransaction(async (tx) => {
      const profileRef = this.db.collection(COLLECTIONS.creatorProfiles).doc(userId);
      const profileSnap = await tx.get(profileRef);
      if (!profileSnap.exists) {
        throw new Error('NOT_FOUND');
      }
      const existing = creatorProfileFromDoc(profileSnap.id, profileSnap.data()!);
      const now = new Date();

      if (data.handle !== existing.handle) {
        const newHandleRef = this.db.collection(COLLECTIONS.creatorHandles).doc(data.handle);
        const newHandleSnap = await tx.get(newHandleRef);
        if (newHandleSnap.exists) {
          throw new UniqueViolationError('handle');
        }
        tx.delete(this.db.collection(COLLECTIONS.creatorHandles).doc(existing.handle));
        tx.set(newHandleRef, { userId, profileId: existing.id });
      }

      tx.update(profileRef, {
        displayName: data.displayName,
        handle: data.handle,
        bio: data.bio,
        updatedAt: this.ts(now),
      });

      return {
        ...existing,
        displayName: data.displayName,
        handle: data.handle,
        bio: data.bio,
        updatedAt: now,
      };
    });
  }

  async createVideoWithUploadSessionInTransaction(
    tx: Transaction,
    video: {
      ownerId: string;
      title: string;
      description: string;
      visibility: VideoVisibility;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    },
    upload: {
      objectKey: string;
      uploadTokenHash: string;
      expiresAt: Date;
    },
  ): Promise<Video> {
    const now = new Date();
    const videoId = randomUUID();
    const sessionId = randomUUID();

    const tokenRef = this.db.collection(COLLECTIONS.uploadTokens).doc(upload.uploadTokenHash);
    const tokenSnap = await tx.get(tokenRef);
    if (tokenSnap.exists) {
      throw new UniqueViolationError('uploadTokenHash');
    }

    const sessionRef = this.db.collection(COLLECTIONS.uploadSessions).doc(sessionId);
    tx.set(sessionRef, {
      videoId,
      objectKey: upload.objectKey,
      uploadTokenHash: upload.uploadTokenHash,
      expiresAt: this.ts(upload.expiresAt),
      completedAt: null,
      createdAt: this.ts(now),
      updatedAt: this.ts(now),
    });
    tx.set(tokenRef, { sessionId });

    const videoRef = this.db.collection(COLLECTIONS.videos).doc(videoId);
    tx.set(videoRef, {
      ownerId: video.ownerId,
      title: video.title,
      description: video.description,
      status: 'UPLOADING' satisfies VideoStatus,
      visibility: video.visibility,
      fileName: video.fileName,
      mimeType: video.mimeType,
      sizeBytes: video.sizeBytes,
      createdAt: this.ts(now),
      updatedAt: this.ts(now),
    });

    return {
      id: videoId,
      ownerId: video.ownerId,
      title: video.title,
      description: video.description,
      status: 'UPLOADING',
      visibility: video.visibility,
      fileName: video.fileName,
      mimeType: video.mimeType,
      sizeBytes: video.sizeBytes,
      createdAt: now,
      updatedAt: now,
    };
  }

  async completeUploadInTransaction(
    sessionId: string,
    videoId: string,
    ownerId: string,
  ): Promise<Video | 'conflict'> {
    return this.firestoreService.runTransaction(async (tx) => {
      const sessionRef = this.db.collection(COLLECTIONS.uploadSessions).doc(sessionId);
      const sessionSnap = await tx.get(sessionRef);
      if (!sessionSnap.exists) {
        return 'conflict';
      }
      const session = uploadSessionFromDoc(sessionSnap.id, sessionSnap.data()!);
      const videoRef = this.db.collection(COLLECTIONS.videos).doc(videoId);
      const videoSnap = await tx.get(videoRef);
      if (!videoSnap.exists) {
        return 'conflict';
      }
      const video = videoFromDoc(videoSnap.id, videoSnap.data()!);

      if (session.completedAt !== null && video.status === 'UPLOADED') {
        return video;
      }

      const now = new Date();
      if (session.expiresAt <= now || session.completedAt !== null) {
        return 'conflict';
      }
      if (video.ownerId !== ownerId || video.status !== 'UPLOADING') {
        return 'conflict';
      }

      tx.update(sessionRef, {
        completedAt: this.ts(now),
        updatedAt: this.ts(now),
      });
      tx.update(videoRef, {
        status: 'UPLOADED',
        updatedAt: this.ts(now),
      });

      return {
        ...video,
        status: 'UPLOADED',
        updatedAt: now,
      };
    });
  }

  async upsertCountryPolicy(policy: Omit<CountryPolicy, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date();
    const ref = this.db.collection(COLLECTIONS.countryPolicies).doc(policy.id);
    const existing = await ref.get();
    const createdAt = existing.exists
      ? countryPolicyFromDoc(existing.id, existing.data()!).createdAt
      : now;

    await ref.set({
      signupEnabled: policy.signupEnabled,
      creatorUploadsEnabled: policy.creatorUploadsEnabled,
      adsEnabled: policy.adsEnabled,
      payoutsEnabled: policy.payoutsEnabled,
      dataRegion: policy.dataRegion,
      createdAt: this.ts(createdAt),
      updatedAt: this.ts(now),
    });
  }

  async updateUserRoleIfViewerInTransaction(
    tx: Transaction,
    userId: string,
    role: Role,
    status: UserStatus,
  ): Promise<number> {
    const userRef = this.db.collection(COLLECTIONS.users).doc(userId);
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      return 0;
    }
    const user = userFromDoc(snap.id, snap.data()!);
    if (user.role === 'VIEWER' && user.status === 'ACTIVE') {
      const now = new Date();
      tx.update(userRef, { role, updatedAt: this.ts(now) });
      return 1;
    }
    if (user.role === role && user.status === status) {
      return 1;
    }
    return 0;
  }
}