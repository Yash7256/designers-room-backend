import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { GuidebookAdminController } from './guidebook-admin.controller.js';
import { GuidebookController } from './guidebook.controller.js';
import { GuidebookRepository } from './guidebook.repository.js';
import { GuidebookService } from './guidebook.service.js';
import { R2StorageService } from './r2-storage.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [GuidebookController, GuidebookAdminController],
  providers: [GuidebookService, GuidebookRepository, R2StorageService],
})
export class GuidebookModule {}
