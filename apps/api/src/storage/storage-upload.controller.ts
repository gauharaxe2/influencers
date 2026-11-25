import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';
import { Public } from '../security/public.decorator';
import { StorageService } from './storage.service';

@Public()
@Controller('storage/uploads')
export class LocalUploadController {
  constructor(
    private readonly storageService: StorageService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Put(':token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async upload(
    @Param('token') token: string,
    @Headers('content-length') contentLength: string | undefined,
    @Req() request: Request & { body?: unknown },
  ): Promise<void> {
    if (this.config.storageDriver !== 'local') {
      throw new NotFoundException('Upload endpoint not found');
    }
    if (!Buffer.isBuffer(request.body)) {
      throw new BadRequestException('A raw upload body is required');
    }

    let expectedLength: number | null = null;
    if (contentLength && /^\d+$/.test(contentLength)) {
      const parsed = Number(contentLength);
      expectedLength = Number.isSafeInteger(parsed) ? parsed : null;
    }

    await this.storageService.receiveLocalUpload(token, request.body, expectedLength);
  }
}
