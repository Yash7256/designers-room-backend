import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CalendarService } from './calendar.service.js';
import { WeeksController } from './weeks.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [WeeksController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
