import { Module } from '@nestjs/common';
import { GuidebookModule } from '../guidebook/guidebook.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [GuidebookModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
