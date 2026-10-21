import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto.js';
import { CreateRoadmapDto } from './dto/create-roadmap.dto.js';
import { CreateStageDto } from './dto/create-stage.dto.js';
import { CreateTopicDto } from './dto/create-topic.dto.js';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto.js';
import { UpdateRoadmapDto } from './dto/update-roadmap.dto.js';
import { UpdateStageDto } from './dto/update-stage.dto.js';
import { UpdateTopicDto } from './dto/update-topic.dto.js';
import { GuidebookService, MAX_MARKDOWN_BYTES } from './guidebook.service.js';
import { MarkdownUpload } from './guidebook.types.js';

@ApiTags('guidebook')
@ApiBearerAuth()
@Controller('admin')
@Roles('ADMIN')
export class GuidebookAdminController {
  constructor(private readonly guidebookService: GuidebookService) {}

  @Post('roadmaps')
  async createRoadmap(
    @Body() dto: CreateRoadmapDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.guidebookService.createRoadmap(dto, req.user.userId);
  }

  @Patch('roadmaps/:id')
  updateRoadmap(@Param('id') id: string, @Body() dto: UpdateRoadmapDto) {
    return this.guidebookService.updateRoadmap(id, dto);
  }

  @Delete('roadmaps/:id')
  async deleteRoadmap(@Param('id') id: string) {
    await this.guidebookService.deleteRoadmap(id);
    return { success: true };
  }

  @Post('roadmaps/:roadmapId/stages')
  createStage(@Param('roadmapId') roadmapId: string, @Body() dto: CreateStageDto) {
    return this.guidebookService.createStage(roadmapId, dto);
  }

  @Patch('stages/:id')
  updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.guidebookService.updateStage(id, dto);
  }

  @Delete('stages/:id')
  async deleteStage(@Param('id') id: string) {
    await this.guidebookService.deleteStage(id);
    return { success: true };
  }

  @Post('stages/:stageId/checkpoints')
  createCheckpoint(@Param('stageId') stageId: string, @Body() dto: CreateCheckpointDto) {
    return this.guidebookService.createCheckpoint(stageId, dto);
  }

  @Patch('checkpoints/:id')
  updateCheckpoint(@Param('id') id: string, @Body() dto: UpdateCheckpointDto) {
    return this.guidebookService.updateCheckpoint(id, dto);
  }

  @Delete('checkpoints/:id')
  async deleteCheckpoint(@Param('id') id: string) {
    await this.guidebookService.deleteCheckpoint(id);
    return { success: true };
  }

  @Post('roadmaps/:roadmapId/topics')
  createTopic(@Param('roadmapId') roadmapId: string, @Body() dto: CreateTopicDto) {
    return this.guidebookService.createTopic(roadmapId, dto);
  }

  @Patch('topics/:id')
  updateTopic(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.guidebookService.updateTopic(id, dto);
  }

  @Delete('topics/:id')
  async deleteTopic(@Param('id') id: string) {
    await this.guidebookService.deleteTopic(id);
    return { success: true };
  }

  @Post('roadmaps/:roadmapId/topics/:topicId/content')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_MARKDOWN_BYTES } }))
  uploadTopicContent(
    @Param('roadmapId') roadmapId: string,
    @Param('topicId') topicId: string,
    @UploadedFile() file: MarkdownUpload | undefined,
  ) {
    return this.guidebookService.uploadTopicContent(roadmapId, topicId, file);
  }

  @Delete('roadmaps/:roadmapId/topics/:topicId/content')
  async deleteTopicContent(
    @Param('roadmapId') roadmapId: string,
    @Param('topicId') topicId: string,
  ) {
    await this.guidebookService.deleteTopicContent(roadmapId, topicId);
    return { success: true };
  }
}
