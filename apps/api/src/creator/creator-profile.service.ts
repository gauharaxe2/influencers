import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreatorProfileDto, UpdateCreatorProfileInput } from '@creator-platform/contracts';
import type { User } from '../domain/types';
import { allocateCreatorHandle } from '../common/creator-handle';
import { toCreatorProfileDto } from '../common/dto-mappers';
import { isUniqueViolation } from '../common/unique-violation';
import { FirestoreRepository } from '../firestore/firestore.repository';
import { FirestoreService } from '../firestore/firestore.service';

@Injectable()
export class CreatorProfileService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly repository: FirestoreRepository,
  ) {}

  async createOrGet(user: User): Promise<CreatorProfileDto> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const profile = await this.firestore.runTransaction(async (transaction) => {
          // All reads first — Firestore forbids reads after writes in a transaction.
          const currentUser = await this.repository.getUserInTransaction(transaction, user.id);
          if (!currentUser || currentUser.status !== 'ACTIVE') {
            throw new ForbiddenException('Account is not active');
          }
          if (currentUser.role !== 'VIEWER' && currentUser.role !== 'CREATOR') {
            throw new ForbiddenException('You do not have access to this resource');
          }

          const existing = await this.repository.getCreatorProfileInTransaction(transaction, user.id);
          if (existing) {
            if (currentUser.role === 'VIEWER') {
              await this.repository.updateUserRoleIfViewerInTransaction(
                transaction,
                user.id,
                'CREATOR',
                'ACTIVE',
              );
            }
            return existing;
          }

          const handle = await allocateCreatorHandle(
            transaction,
            this.firestore.firestore,
            currentUser.displayName,
          );

          await this.repository.updateUserRoleIfViewerInTransaction(
            transaction,
            user.id,
            'CREATOR',
            'ACTIVE',
          );
          return this.repository.writeCreatorProfileInTransaction(transaction, {
            userId: currentUser.id,
            handle,
            displayName: currentUser.displayName,
          });
        });

        return toCreatorProfileDto(profile);
      } catch (error) {
        if (isUniqueViolation(error, 'handle')) {
          continue;
        }
        if (isUniqueViolation(error, 'userId')) {
          const profile = await this.repository.findCreatorProfileByUserId(user.id);
          if (profile) {
            return toCreatorProfileDto(profile);
          }
        }
        if (error instanceof ForbiddenException) {
          throw error;
        }
        throw error;
      }
    }

    throw new ConflictException('Unable to allocate a unique creator handle');
  }

  async get(userId: string): Promise<CreatorProfileDto> {
    const profile = await this.repository.findCreatorProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }
    return toCreatorProfileDto(profile);
  }

  async update(userId: string, input: UpdateCreatorProfileInput): Promise<CreatorProfileDto> {
    try {
      const profile = await this.repository.updateCreatorProfile(userId, {
        displayName: input.displayName,
        handle: input.handle,
        bio: input.bio,
      });
      return toCreatorProfileDto(profile);
    } catch (error) {
      if (isUniqueViolation(error, 'handle')) {
        throw new ConflictException('Creator handle is not available');
      }
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        throw new NotFoundException('Creator profile not found');
      }
      throw error;
    }
  }
}