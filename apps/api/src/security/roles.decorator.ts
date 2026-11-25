import { SetMetadata } from '@nestjs/common';
import type { Role } from '../domain/types';

export const ROLES_KEY = 'creator-platform:roles';

export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
