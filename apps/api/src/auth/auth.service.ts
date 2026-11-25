import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthDto, LoginInput, RegisterInput } from '@creator-platform/contracts';
import type { Transaction } from 'firebase-admin/firestore';
import { argon2id, hash, verify } from 'argon2';
import { randomBytes, randomUUID } from 'node:crypto';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';
import { CountryPolicyService } from '../common/country-policy.service';
import { allocateCreatorHandle } from '../common/creator-handle';
import { toUserDto } from '../common/dto-mappers';
import { isUniqueViolation } from '../common/unique-violation';
import { sha256 } from '../common/token-hash';
import type { User } from '../domain/types';
import { FirestoreRepository } from '../firestore/firestore.repository';
import { FirestoreService } from '../firestore/firestore.service';
import { COLLECTIONS } from '../firestore/collections';
import { sessionFromDoc, userFromDoc } from '../firestore/converters';
import {
  JWT_AUDIENCE,
  JWT_ISSUER,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../security/security.constants';

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly repository: FirestoreRepository,
    private readonly countryPolicies: CountryPolicyService,
    private readonly jwtService: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async register(input: RegisterInput): Promise<AuthDto> {
    await this.countryPolicies.requireSignup(input.countryCode);
    const passwordHash = await hash(input.password, { type: argon2id });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.firestore.runTransaction(async (transaction) => {
          const handle =
            input.accountType === 'CREATOR'
              ? await allocateCreatorHandle(transaction, this.firestore.firestore, input.displayName)
              : null;

          const user = await this.repository.createUserInTransaction(transaction, {
            email: input.email,
            passwordHash,
            displayName: input.displayName,
            countryCode: input.countryCode,
            role: input.accountType,
          });

          if (handle) {
            await this.repository.createCreatorProfileInTransaction(transaction, {
              userId: user.id,
              handle,
              displayName: input.displayName,
            });
          }

          return this.issueAuth(user, transaction);
        });
      } catch (error) {
        if (input.accountType === 'CREATOR' && isUniqueViolation(error, 'handle')) {
          continue;
        }
        if (isUniqueViolation(error, 'email')) {
          throw new ConflictException('Unable to complete registration with the provided details');
        }
        throw error;
      }
    }

    throw new ConflictException('Unable to complete registration with the provided details');
  }

  async login(input: LoginInput): Promise<AuthDto> {
    const user = await this.repository.findUserByEmail(input.email);

    if (!user) {
      await hash(randomBytes(32).toString('hex'), { type: argon2id });
      throw this.invalidCredentials();
    }

    const passwordMatches = await verify(user.passwordHash, input.password).catch(() => false);

    if (!passwordMatches || user.status !== 'ACTIVE') {
      throw this.invalidCredentials();
    }

    return this.firestore.runTransaction((transaction) => this.issueAuth(user, transaction));
  }

  async refresh(refreshToken: string): Promise<AuthDto> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.jwtRefreshSecret,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      if (
        payload.type !== 'refresh' ||
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string'
      ) {
        throw new Error('Invalid refresh token');
      }
    } catch {
      throw this.invalidRefresh();
    }

    const refreshTokenHash = sha256(refreshToken);

    return this.firestore.runTransaction(async (transaction) => {
      const db = this.firestore.firestore;
      const tokenSnap = await transaction.get(db.collection(COLLECTIONS.sessionTokens).doc(refreshTokenHash));
      if (!tokenSnap.exists) {
        throw this.invalidRefresh();
      }

      const sessionId = tokenSnap.data()!.sessionId as string;
      const sessionSnap = await transaction.get(db.collection(COLLECTIONS.sessions).doc(sessionId));
      if (!sessionSnap.exists) {
        throw this.invalidRefresh();
      }

      const session = sessionFromDoc(sessionSnap.id, sessionSnap.data()!);
      const userSnap = await transaction.get(db.collection(COLLECTIONS.users).doc(session.userId));
      if (!userSnap.exists) {
        throw this.invalidRefresh();
      }
      const user = userFromDoc(userSnap.id, userSnap.data()!);

      if (
        session.id !== payload.sid ||
        session.userId !== payload.sub ||
        session.revokedAt !== null ||
        session.expiresAt <= new Date() ||
        user.status !== 'ACTIVE'
      ) {
        throw this.invalidRefresh();
      }

      const revoked = await this.repository.revokeSessionInTransaction(
        transaction,
        session.id,
        refreshTokenHash,
      );
      if (!revoked) {
        throw this.invalidRefresh();
      }

      return this.issueAuth(user, transaction);
    });
  }

  async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.repository.revokeSessionsByRefreshTokenHash(sha256(refreshToken));
  }

  private async issueAuth(user: User, transaction: Transaction): Promise<AuthDto> {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, sid: sessionId, type: 'refresh' },
      {
        secret: this.config.jwtRefreshSecret,
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      },
    );

    await this.repository.createSessionInTransaction(transaction, {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: sha256(refreshToken),
      expiresAt,
    });

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'access' },
      {
        secret: this.config.jwtAccessSecret,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      },
    );

    return {
      user: toUserDto(user),
      accessToken,
      refreshToken,
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException('Invalid email or password');
  }

  private invalidRefresh(): UnauthorizedException {
    return new UnauthorizedException('Invalid or expired refresh token');
  }
}