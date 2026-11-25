import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { CreatorModule } from './creator/creator.module';
import { FirestoreModule } from './firestore/firestore.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './security/jwt-auth.guard';
import { RolesGuard } from './security/roles.guard';
import { SecurityModule } from './security/security.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule,
    FirestoreModule,
    SecurityModule,
    StorageModule,
    AuthModule,
    CreatorModule,
    HealthModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 20,
      },
    ]),
  ],
  providers: [
    Reflector,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}