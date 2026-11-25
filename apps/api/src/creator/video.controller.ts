import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import type { UploadSessionDto, VideoDto, VideoUploadInput } from '@creator-platform/contracts';
import { videoUploadSchema } from '@creator-platform/contracts';
import type { User } from '../domain/types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../security/current-user.decorator';
import { Roles } from '../security/roles.decorator';
import { VideoService } from './video.service';

@Controller('creator/videos')
@Roles('CREATOR')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload-sessions')
  createUploadSession(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(videoUploadSchema)) input: VideoUploadInput,
  ): Promise<UploadSessionDto> {
    return this.videoService.createUploadSession(user, input);
  }

  @Post(':id/complete')
  complete(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) videoId: string,
  ): Promise<VideoDto> {
    return this.videoService.complete(user, videoId);
  }

  @Get()
  list(@CurrentUser() user: User): Promise<{ videos: VideoDto[] }> {
    return this.videoService.list(user.id);
  }
}
