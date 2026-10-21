import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CreateGuidebookTopicDto } from './dto/create-guidebook-topic.dto.js';
import { ReorderGuidebookTopicsDto } from './dto/reorder-guidebook-topics.dto.js';
import { UpdateGuidebookTopicDto } from './dto/update-guidebook-topic.dto.js';
import { GuidebookService, MAX_MARKDOWN_BYTES } from './guidebook.service.js';
import { MarkdownUpload } from './guidebook.types.js';

@ApiTags('guidebook')
@ApiBearerAuth()
@Controller('admin/guidebook')
@Roles('ADMIN')
export class GuidebookAdminController {
  constructor(private readonly guidebookService: GuidebookService) {}

  @Post('topics')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_MARKDOWN_BYTES } }))
  async create(
    @UploadedFile() file: MarkdownUpload | undefined,
    @Body() dto: CreateGuidebookTopicDto,
  ) {
    return this.guidebookService.createTopic(dto, file);
  }

  @Patch('topics/:id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_MARKDOWN_BYTES } }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGuidebookTopicDto,
    @UploadedFile() file: MarkdownUpload | undefined,
  ) {
    return this.guidebookService.updateTopic(id, dto, file);
  }

  @Delete('topics/:id')
  async remove(@Param('id') id: string) {
    return this.guidebookService.deleteTopic(id);
  }

  @Post('topics/reorder')
  @ApiOkResponse()
  async reorder(@Body() dto: ReorderGuidebookTopicsDto) {
    return this.guidebookService.reorder(dto.items);
  }
}
