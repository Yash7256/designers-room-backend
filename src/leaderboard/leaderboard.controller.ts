import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { LeaderboardService } from './leaderboard.service.js';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Public()
  @Get('weekly')
  async weekly(@Query('weekId') weekId: string, @Query('top') top?: string) {
    return this.leaderboard.weekly(weekId, top ? parseInt(top) : 50);
  }

  @Public()
  @Get('all-time')
  async allTime(@Query('top') top?: string) {
    return this.leaderboard.allTime(top ? parseInt(top) : 50);
  }
}
