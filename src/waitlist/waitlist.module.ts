import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { WaitlistAdminController, WaitlistController } from './waitlist.controller.js';
import { WaitlistRepository } from './waitlist.repository.js';
import { WaitlistService } from './waitlist.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [WaitlistController, WaitlistAdminController],
  providers: [WaitlistService, WaitlistRepository],
})
export class WaitlistModule {}
