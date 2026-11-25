import type { CookieOptions, Response } from 'express';
import type { AppConfig } from '../config/configuration';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_SECONDS,
} from './security.constants';

function cookieOptions(config: AppConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  response: Response,
  config: AppConfig,
  accessToken: string,
  refreshToken: string,
): void {
  const options = cookieOptions(config);
  response.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...options,
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...options,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(response: Response, config: AppConfig): void {
  const options = cookieOptions(config);
  response.clearCookie(ACCESS_COOKIE_NAME, options);
  response.clearCookie(REFRESH_COOKIE_NAME, options);
}
