import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('me')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  getDashboard(@Req() request: Request & { user: { userId: string } }) {
    return this.dashboardService.getDashboard(request.user.userId);
  }
}
