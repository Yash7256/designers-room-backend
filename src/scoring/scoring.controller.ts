import { Controller, Get, Param, Req } from '@nestjs/common';
import { ScoringService } from './scoring.service.js';

@Controller()
export class ScoringController {
  constructor(private readonly scoring: ScoringService) {}

  @Get('me/progress')
  async progress(@Req() req: any) {
    return this.scoring.getMyProgress(req.user.id);
  }

  @Get('me/streak')
  async streak(@Req() req: any) {
    return this.scoring.getStreak(req.user.id);
  }

  @Get('me/badges')
  async badges(@Req() req: any) {
    return this.scoring.getBadges(req.user.id);
  }

  @Get('weeks/:id/summary')
  async summary(@Req() req: any, @Param('id') weekId: string) {
    return this.scoring.getWeekSummary(req.user.id, weekId);
  }
}
