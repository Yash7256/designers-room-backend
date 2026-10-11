import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export interface RoadmapSummary {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  userId: string | null;
}

export interface RoadmapDetail extends RoadmapSummary {
  topics: {
    id: string;
    title: string;
    description: string | null;
    position: number;
  }[];
}

@Injectable()
export class RoadmapsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    limit: number,
    cursor?: string,
  ): Promise<{ items: RoadmapSummary[]; nextCursor: string | null }> {
    const take = limit + 1; // fetch one extra to determine if there is a next page

    const items = await this.prisma.client.roadmap.findMany({
      take,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        userId: true,
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const last = items.pop()!; // remove the extra item
      nextCursor = last.id;
    }

    return { items, nextCursor };
  }

  findById(id: string): Promise<RoadmapDetail | null> {
    return this.prisma.client.roadmap.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        userId: true,
        topics: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            position: true,
          },
        },
      },
    });
  }
}
