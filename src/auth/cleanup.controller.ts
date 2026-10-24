import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
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
    const provided = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
    const a = createHash('sha256').update(provided).digest();
    const b = createHash('sha256').update(expected).digest();
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException();
    }
    return this.cleanup.run();
  }
}
