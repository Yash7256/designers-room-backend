import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CalendarModule } from '../calendar/calendar.module.js';
import { ChallengesService } from './challenges.service.js';
import { ChallengesController } from './challenges.controller.js';

@Module({
  imports: [DatabaseModule, CalendarModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
