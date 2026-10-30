import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { CalendarService } from './calendar.service.js';

@Controller('weeks')
export class WeeksController {
  constructor(private readonly calendar: CalendarService) {}

  @Public()
  @Get('current')
  async current() {
    return this.calendar.getCurrentWeek();
  }

  @Public()
  @Get()
  async list() {
    return this.calendar.listWeeks();
  }
}
