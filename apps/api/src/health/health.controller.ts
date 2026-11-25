import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../security/public.decorator';

@SkipThrottle()
@Public()
@Controller('health')
export class HealthController {
  @Get()
  health(): { status: 'ok'; service: 'creator-platform-api' } {
    return { status: 'ok', service: 'creator-platform-api' };
  }
}
