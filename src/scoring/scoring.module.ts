import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ScoringService } from './scoring.service.js';
import { ScoringController } from './scoring.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ScoringController],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
