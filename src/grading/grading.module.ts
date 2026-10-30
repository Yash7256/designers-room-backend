import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { QueuesModule } from '../queues/queues.module.js';
import { GradingService } from './grading.service.js';

@Module({
  imports: [DatabaseModule, QueuesModule],
  providers: [GradingService],
  exports: [GradingService],
})
export class GradingModule {}
