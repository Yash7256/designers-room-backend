import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CalendarModule } from '../calendar/calendar.module.js';
import { GradingModule } from '../grading/grading.module.js';
import { AttemptsService } from './attempts.service.js';
import { AttemptsController } from './attempts.controller.js';

@Module({
  imports: [DatabaseModule, CalendarModule, GradingModule],
  controllers: [AttemptsController],
  providers: [AttemptsService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
