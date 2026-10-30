import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AdminChallengesService } from './admin-challenges.service.js';
import { AdminChallengesController } from './admin-challenges.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminChallengesController],
  providers: [AdminChallengesService],
  exports: [AdminChallengesService],
})
export class AdminChallengesModule {}
