import { Injectable, NotFoundException } from '@nestjs/common';
import { RoadmapsRepository } from './roadmaps.repository.js';

@Injectable()
export class RoadmapsService {
  constructor(private readonly roadmapsRepository: RoadmapsRepository) {}

  getAll() {
    return this.roadmapsRepository.findAll();
  }

  async getById(id: string) {
    const roadmap = await this.roadmapsRepository.findById(id);
    if (!roadmap) {
      throw new NotFoundException(`Roadmap ${id} not found`);
    }
    return roadmap;
  }
}
