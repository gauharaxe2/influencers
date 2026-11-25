import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { CreatorProfileController } from './creator-profile.controller';
import { CreatorProfileService } from './creator-profile.service';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

@Module({
  imports: [CommonModule],
  controllers: [CreatorProfileController, VideoController],
  providers: [CreatorProfileService, VideoService],
})
export class CreatorModule {}
