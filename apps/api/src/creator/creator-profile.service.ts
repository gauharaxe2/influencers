import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreatorProfileDto, UpdateCreatorProfileInput } from '@creator-platform/contracts';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { allocateCreatorHandle } from '../common/creator-handle';
import { toCreatorProfileDto } from '../common/dto-mappers';
import { isUniqueViolation } from '../common/prisma-error';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreatorProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrGet(user: User): Promise<CreatorProfileDto> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const profile = await this.prisma.$transaction(async (transaction) => {
          await transaction.user.updateMany({
            where: { id: user.id, role: 'VIEWER', status: 'ACTIVE' },
            data: { role: 'CREATOR' },
          });

          const currentUser = await transaction.user.findUnique({ where: { id: user.id } });
          if (!currentUser || currentUser.status !== 'ACTIVE') {
            throw new ForbiddenException('Account is not active');
          }
          if (currentUser.role !== 'VIEWER' && currentUser.role !== 'CREATOR') {
            throw new ForbiddenException('You do not have access to this resource');
          }

          const existing = await transaction.creatorProfile.findUnique({
            where: { userId: user.id },
          });
          if (existing) {
            return existing;
          }

          const handle = await allocateCreatorHandle(transaction, currentUser.displayName);
          return transaction.creatorProfile.create({
            data: {
              userId: currentUser.id,
              handle,
              displayName: currentUser.displayName,
            },
          });
        });

        return toCreatorProfileDto(profile);
      } catch (error) {
        if (isUniqueViolation(error, 'handle')) {
          continue;
        }
        if (isUniqueViolation(error, 'userId')) {
          const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: user.id } });
          if (profile) {
            return toCreatorProfileDto(profile);
          }
        }
        throw error;
      }
    }

    throw new ConflictException('Unable to allocate a unique creator handle');
  }

  async get(userId: string): Promise<CreatorProfileDto> {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }
    return toCreatorProfileDto(profile);
  }

  async update(userId: string, input: UpdateCreatorProfileInput): Promise<CreatorProfileDto> {
    try {
      const profile = await this.prisma.creatorProfile.update({
        where: { userId },
        data: {
          displayName: input.displayName,
          handle: input.handle,
          bio: input.bio,
        },
      });
      return toCreatorProfileDto(profile);
    } catch (error) {
      if (isUniqueViolation(error, 'handle')) {
        throw new ConflictException('Creator handle is not available');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Creator profile not found');
      }
      throw error;
    }
  }
}
