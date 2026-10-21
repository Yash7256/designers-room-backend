import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { GuidebookTopicRow } from './guidebook.types.js';

export interface GuidebookTopicCreateInput {
  title: string;
  slug: string;
  position: number;
  summary: string | null;
  objectKey: string;
}

export interface GuidebookTopicUpdateInput {
  title?: string;
  slug?: string;
  position?: number;
  summary?: string | null;
  objectKey?: string;
}

@Injectable()
export class GuidebookRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<GuidebookTopicRow[]> {
    return this.prisma.client.guidebookTopic.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findById(id: string): Promise<GuidebookTopicRow | null> {
    return this.prisma.client.guidebookTopic.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<GuidebookTopicRow | null> {
    return this.prisma.client.guidebookTopic.findUnique({ where: { slug } });
  }

  nextPosition(): Promise<number> {
    return this.prisma.client.guidebookTopic
      .aggregate({ _max: { position: true } })
      .then((result) => (result._max.position ?? 0) + 1);
  }

  create(data: GuidebookTopicCreateInput): Promise<GuidebookTopicRow> {
    return this.prisma.client.guidebookTopic.create({ data });
  }

  update(id: string, data: GuidebookTopicUpdateInput): Promise<GuidebookTopicRow> {
    return this.prisma.client.guidebookTopic.update({ where: { id }, data });
  }

  delete(id: string): Promise<GuidebookTopicRow> {
    return this.prisma.client.guidebookTopic.delete({ where: { id } });
  }

  updatePositions(items: { id: string; position: number }[]): Promise<GuidebookTopicRow[]> {
    return this.prisma.client.$transaction(
      items.map((item) =>
        this.prisma.client.guidebookTopic.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );
  }
}
