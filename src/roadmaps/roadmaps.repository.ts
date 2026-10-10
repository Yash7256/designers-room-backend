import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class RoadmapsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.roadmap.findMany();
  }

  findById(id: string) {
    return this.prisma.roadmap.findUnique({ where: { id } });
  }
}
