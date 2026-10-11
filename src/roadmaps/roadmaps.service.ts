import { Injectable, NotFoundException } from '@nestjs/common';
import { RoadmapsRepository } from './roadmaps.repository.js';
import { PaginateRoadmapsDto } from './dto/paginate-roadmaps.dto.js';

@Injectable()
export class RoadmapsService {
  constructor(private readonly roadmapsRepository: RoadmapsRepository) {}

  getAll(dto: PaginateRoadmapsDto) {
    return this.roadmapsRepository.findAll(dto.limit ?? 20, dto.cursor);
  }

  async getById(id: string) {
    const roadmap = await this.roadmapsRepository.findById(id);
    if (!roadmap) {
      throw new NotFoundException(`Roadmap ${id} not found`);
    }
    return roadmap;
  }
}
