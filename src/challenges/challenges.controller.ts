import { Controller, Get, Param, Req } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { ChallengesService } from './challenges.service.js';

@Controller()
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}

  @Public()
  @Get('weeks/:id/challenges')
  async listByWeek(@Param('id') weekId: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.challenges.listByWeek(weekId, userId);
  }

  @Public()
  @Get('challenges/:id')
  async get(@Param('id') id: string) {
    return this.challenges.getChallenge(id);
  }
}
