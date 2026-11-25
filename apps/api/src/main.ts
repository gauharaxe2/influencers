import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { json, raw } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { APP_CONFIG, ConfigurationError, loadConfig } from './config/configuration';
import type { AppConfig } from './config/configuration';

function parserErrorStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = Number((error as { status: unknown }).status);
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      return status;
    }
  }
  return 400;
}

async function bootstrap(): Promise<void> {
  loadConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get<AppConfig>(APP_CONFIG);

  app.enableCors({
    origin: config.webOrigin,
    credentials: true,
  });
  app.use(cookieParser());

  if (config.storageDriver === 'local') {
    const rawUploadParser = raw({
      type: () => true,
      limit: config.maxUploadBytes,
      inflate: false,
    });
    app.use('/api/v1/storage/uploads', (request: Request, response: Response, next: NextFunction) => {
      if (request.method !== 'PUT') {
        next();
        return;
      }

      const contentLength = request.headers['content-length'];
      if (!contentLength) {
        response.status(411).json({ statusCode: 411, message: 'Content-Length is required' });
        return;
      }
      if (!/^\d+$/.test(contentLength)) {
        response.status(400).json({ statusCode: 400, message: 'Invalid Content-Length' });
        return;
      }
      if (Number(contentLength) > config.maxUploadBytes) {
        response.status(413).json({ statusCode: 413, message: 'Upload exceeds the maximum allowed size' });
        return;
      }
      const contentEncoding = request.headers['content-encoding'];
      if (contentEncoding && contentEncoding !== 'identity') {
        response.status(415).json({ statusCode: 415, message: 'Compressed uploads are not supported' });
        return;
      }

      rawUploadParser(request, response, (error?: unknown) => {
        if (error) {
          const status = parserErrorStatus(error);
          response.status(status).json({
            statusCode: status,
            message: status === 413 ? 'Upload exceeds the maximum allowed size' : 'Invalid upload body',
          });
          return;
        }
        next();
      });
    });
  }

  const jsonParser = json({ limit: '100kb', inflate: false });
  app.use((request: Request, response: Response, next: NextFunction) => {
    jsonParser(request, response, (error?: unknown) => {
      if (error) {
        const status = parserErrorStatus(error);
        response.status(status).json({
          statusCode: status,
          message: status === 413 ? 'Request body is too large' : 'Invalid JSON body',
        });
        return;
      }
      next();
    });
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
  Logger.log(`Creator platform API listening on port ${config.port}`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  if (error instanceof ConfigurationError) {
    process.stderr.write(`${error.message}\n`);
  } else if (process.env.NODE_ENV === 'production') {
    process.stderr.write('API initialization failed\n');
  } else {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  }
  process.exit(1);
});
