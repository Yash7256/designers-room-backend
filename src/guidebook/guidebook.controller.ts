import { Body, Controller, Get, Param, Patch, Query, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';
import { PaginateRoadmapsDto } from './dto/paginate-roadmaps.dto.js';
import { SetProgressDto } from './dto/set-progress.dto.js';
import { GuidebookService } from './guidebook.service.js';

@ApiTags('guidebook')
@Controller('guidebook')
export class GuidebookController {
  constructor(private readonly guidebookService: GuidebookService) {}

  @Public()
  @ApiOkResponse()
  @Get()
  async list(@Query() dto: PaginateRoadmapsDto, @Res() res: Response) {
    const result = await this.guidebookService.list(dto.limit ?? 20, dto.cursor);
    const etag = `"${createHash('sha1').update(JSON.stringify(result)).digest('hex')}"`;
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.setHeader('ETag', etag);
    return res.json(result);
  }

  @Public()
  @ApiOkResponse()
  @Get(':id')
  async getById(@Param('id') id: string, @Res() res: Response) {
    const guidebook = await this.guidebookService.getDetail(id);
    const etag = `"${createHash('sha1').update(JSON.stringify(guidebook)).digest('hex')}"`;
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.setHeader('ETag', etag);
    return res.json(guidebook);
  }

  @Public()
  @ApiOkResponse()
  @Get(':id/topics/:topicId/content')
  async getTopicContent(
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Res() res: Response,
  ) {
    const { content, contentType, sizeBytes, etag } = await this.guidebookService.getTopicContent(
      id,
      topicId,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', sizeBytes);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=60');
    if (res.req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    return res.send(content);
  }

  @ApiOkResponse()
  @Get(':id/progress')
  async getProgress(
    @Param('id') id: string,
    @Req() request: Request & { user: { userId: string } },
  ) {
    const progress = await this.guidebookService.getProgress(id, request.user.userId);
    return { items: progress };
  }

  @ApiOkResponse()
  @Patch(':id/topics/:topicId/progress')
  async setProgress(
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Req() request: Request & { user: { userId: string } },
    @Body() dto: SetProgressDto,
  ) {
    return this.guidebookService.setProgress(id, topicId, request.user.userId, dto.status);
  }
}
