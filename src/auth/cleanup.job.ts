import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CleanupService } from './cleanup.service.js';

@Injectable()
export class CleanupJob {
  private readonly logger = new Logger(CleanupJob.name);
  constructor(private readonly cleanup: CleanupService) {}
  @Cron(process.env['CLEANUP_CRON'] ?? '0 2 * * *')
  async run(): Promise<void> {
    await this.cleanup.run();
  }
}
