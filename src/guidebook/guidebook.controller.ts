import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GuidebookService } from './guidebook.service.js';

@ApiTags('guidebook')
@Controller('guidebook')
export class GuidebookController {
  constructor(private readonly guidebookService: GuidebookService) {}

  @ApiOkResponse()
  @Get('topics')
  async list(@Res() res: Response) {
    const items = await this.guidebookService.list();
    res.setHeader('Cache-Control', 'private, max-age=30');
    return res.json({ items });
  }

  @ApiOkResponse()
  @Get('topics/:id')
  async getById(@Param('id') id: string, @Res() res: Response) {
    const topic = await this.guidebookService.getTopic(id);
    res.setHeader('Cache-Control', 'private, max-age=30');
    return res.json(topic);
  }

  @ApiOkResponse()
  @Get('topics/:id/content')
  async getContent(@Param('id') id: string, @Res() res: Response) {
    const { content, contentType, sizeBytes, etag } = await this.guidebookService.getContent(id);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', sizeBytes);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=60');
    if (res.req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    return res.send(content);
  }
}
