import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthDto, LoginInput, RegisterInput, UserDto } from '@creator-platform/contracts';
import { loginSchema, registerSchema } from '@creator-platform/contracts';
import type { User } from '@prisma/client';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';
import { toUserDto } from '../common/dto-mappers';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { clearAuthCookies, setAuthCookies } from '../security/auth-cookies';
import { CurrentUser } from '../security/current-user.decorator';
import { Public } from '../security/public.decorator';
import { REFRESH_COOKIE_NAME } from '../security/security.constants';
import { AuthService } from './auth.service';

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(8192).optional(),
});

type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) input: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthDto> {
    const auth = await this.authService.register(input);
    setAuthCookies(response, this.config, auth.accessToken, auth.refreshToken);
    return auth;
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthDto> {
    const auth = await this.authService.login(input);
    setAuthCookies(response, this.config, auth.accessToken, auth.refreshToken);
    return auth;
  }

  @Get('me')
  me(@CurrentUser() user: User): UserDto {
    return toUserDto(user);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) input: RefreshTokenInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthDto> {
    const refreshToken = input.refreshToken ?? this.refreshCookie(response.req);
    const auth = await this.authService.refresh(refreshToken ?? '');
    setAuthCookies(response, this.config, auth.accessToken, auth.refreshToken);
    return auth;
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body(new ZodValidationPipe(refreshTokenSchema)) input: RefreshTokenInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(input.refreshToken ?? this.refreshCookie(response.req));
    clearAuthCookies(response, this.config);
  }

  private refreshCookie(request: Request): string | null {
    const cookies = (request as Request & { cookies?: Record<string, string | undefined> }).cookies;
    return cookies?.[REFRESH_COOKIE_NAME] ?? null;
  }
}
