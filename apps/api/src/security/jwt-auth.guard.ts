import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';
import { FirestoreRepository } from '../firestore/firestore.repository';
import { ACCESS_COOKIE_NAME, JWT_AUDIENCE, JWT_ISSUER } from './security.constants';
import { IS_PUBLIC_KEY } from './public.decorator';

interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly repository: FirestoreRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.jwtAccessSecret,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      if (payload.type !== 'access' || typeof payload.sub !== 'string') {
        throw new Error('Invalid access token');
      }

      const user = await this.repository.findUserById(payload.sub);
      if (!user || user.status !== 'ACTIVE') {
        throw new Error('Inactive user');
      }

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private extractToken(request: Request): string | null {
    const authorization = request.headers.authorization;
    if (authorization) {
      const match = /^Bearer\s+(.+)$/i.exec(authorization);
      return match?.[1]?.trim() || null;
    }

    const cookies = (request as Request & { cookies?: Record<string, string | undefined> }).cookies;
    return cookies?.[ACCESS_COOKIE_NAME] || null;
  }
}