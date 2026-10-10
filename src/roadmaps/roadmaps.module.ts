import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { RoadmapsController } from './roadmaps.controller.js';
import { RoadmapsRepository } from './roadmaps.repository.js';
import { RoadmapsService } from './roadmaps.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [RoadmapsController],
  providers: [RoadmapsService, RoadmapsRepository],
})
export class RoadmapsModule {}
