import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';
import { LocalStorageDriver } from './local-storage.driver';
import { LocalUploadController } from './storage-upload.controller';
import { S3StorageDriver } from './s3-storage.driver';
import { StorageService } from './storage.service';
import { STORAGE_DRIVER } from './storage.types';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [LocalUploadController],
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        config.storageDriver === 's3' ? new S3StorageDriver(config) : new LocalStorageDriver(config),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}