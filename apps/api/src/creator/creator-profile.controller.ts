import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import type { CreatorProfileDto, UpdateCreatorProfileInput } from '@creator-platform/contracts';
import { updateCreatorProfileSchema } from '@creator-platform/contracts';
import type { User } from '@prisma/client';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../security/current-user.decorator';
import { Roles } from '../security/roles.decorator';
import { CreatorProfileService } from './creator-profile.service';

@Controller('creator/profile')
export class CreatorProfileController {
  constructor(private readonly profileService: CreatorProfileService) {}

  @Post()
  @Roles('VIEWER', 'CREATOR')
  create(@CurrentUser() user: User): Promise<CreatorProfileDto> {
    return this.profileService.createOrGet(user);
  }

  @Patch()
  @Roles('CREATOR')
  update(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(updateCreatorProfileSchema)) input: UpdateCreatorProfileInput,
  ): Promise<CreatorProfileDto> {
    return this.profileService.update(user.id, input);
  }

  @Get()
  @Roles('CREATOR')
  get(@CurrentUser() user: User): Promise<CreatorProfileDto> {
    return this.profileService.get(user.id);
  }
}
