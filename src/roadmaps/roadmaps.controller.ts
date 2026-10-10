import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoadmapsService } from './roadmaps.service.js';

@ApiTags('roadmaps')
@Controller('roadmaps')
export class RoadmapsController {
  constructor(private readonly roadmapsService: RoadmapsService) {}

  @Get()
  getAll() {
    return this.roadmapsService.getAll();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.roadmapsService.getById(id);
  }
}
