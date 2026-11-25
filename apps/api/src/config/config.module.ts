import { Global, Module } from '@nestjs/common';
import { APP_CONFIG } from './configuration';
import { AppConfig, loadConfig } from './configuration';

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => loadConfig(),
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
