import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from './decorators/public.decorator.js';
import { CleanupService } from './cleanup.service.js';

@Controller('internal')
export class CleanupController {
  constructor(
    private readonly cleanup: CleanupService,
    private readonly config: ConfigService,
  ) {}

  /** Called by Vercel Cron. It is intentionally not exposed as an authenticated user route. */
  @Get('cleanup')
  @Public()
  async run(@Headers('authorization') authorization?: string) {
    const expected = this.config.getOrThrow<string>('CRON_SECRET');
    if (authorization !== `Bearer ${expected}`) {
      throw new UnauthorizedException();
    }
    return this.cleanup.run();
  }
}
