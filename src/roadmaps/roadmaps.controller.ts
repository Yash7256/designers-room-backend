import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createHash } from 'crypto';
import type { Response } from 'express';
import { PaginateRoadmapsDto } from './dto/paginate-roadmaps.dto.js';
import { RoadmapsService } from './roadmaps.service.js';

function isCuid(value: string): boolean {
  return /^c[a-z0-9]{24}$/.test(value);
}

@ApiTags('roadmaps')
@Controller('roadmaps')
export class RoadmapsController {
  constructor(private readonly roadmapsService: RoadmapsService) {}

  @Get()
  async getAll(@Query() dto: PaginateRoadmapsDto, @Res() res: Response) {
    const result = await this.roadmapsService.getAll(dto);
    const etag = `"${createHash('sha1').update(JSON.stringify(result)).digest('hex')}"`;
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.setHeader('ETag', etag);
    return res.json(result);
  }

  @ApiOkResponse()
  @Get(':id')
  async getById(@Param('id') id: string, @Res() res: Response) {
    if (!isCuid(id)) {
      return res.status(400).json({ statusCode: 400, message: 'Invalid id format' });
    }
    const roadmap = await this.roadmapsService.getById(id);
    const etag = `"${createHash('sha1').update(JSON.stringify(roadmap)).digest('hex')}"`;
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.setHeader('ETag', etag);
    return res.json(roadmap);
  }
}
