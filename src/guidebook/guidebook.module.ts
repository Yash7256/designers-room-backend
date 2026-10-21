import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { GuidebookAdminController } from './guidebook-admin.controller.js';
import { GuidebookController } from './guidebook.controller.js';
import { GuidebookRepository } from './guidebook.repository.js';
import { GuidebookService } from './guidebook.service.js';
import { RoadmapsController } from './roadmaps.controller.js';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [RoadmapsController, GuidebookController, GuidebookAdminController],
  providers: [GuidebookService, GuidebookRepository],
})
export class GuidebookModule {}
