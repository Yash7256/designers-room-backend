import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  CheckpointRow,
  GuidebookDetail,
  GuidebookSummary,
  ProgressRow,
  RoadmapMetadata,
  StageRow,
  TopicRow,
  TopicStatus,
} from './guidebook.types.js';

export interface RoadmapCreateInput {
  title: string;
  slug: string;
  description?: string | null;
  position?: number;
  metadata?: RoadmapMetadata | null;
  userId?: string | null;
}

export interface RoadmapUpdateInput {
  title?: string;
  slug?: string;
  description?: string | null;
  position?: number;
  metadata?: RoadmapMetadata | null;
}

export interface StageCreateInput {
  roadmapId: string;
  position: number;
  title: string;
  subtitle?: string | null;
  byTheEnd?: string | null;
  weekLabel?: string | null;
  prerequisiteStage?: number | null;
}

export interface StageUpdateInput {
  position?: number;
  title?: string;
  subtitle?: string | null;
  byTheEnd?: string | null;
  weekLabel?: string | null;
  prerequisiteStage?: number | null;
}

export interface CheckpointCreateInput {
  stageId: string;
  position: number;
  task: string;
  timeEstimate?: string | null;
}

export interface CheckpointUpdateInput {
  position?: number;
  task?: string;
  timeEstimate?: string | null;
}

export interface TopicCreateInput {
  roadmapId: string;
  position: number;
  title: string;
  description?: string | null;
  stage?: number | null;
  difficulty?: string | null;
  estimatedMinutes?: number | null;
  objectKey?: string | null;
}

export interface TopicUpdateInput {
  title?: string;
  description?: string | null;
  position?: number;
  stage?: number | null;
  difficulty?: string | null;
  estimatedMinutes?: number | null;
  objectKey?: string | null;
}

const topicSelect = {
  id: true,
  title: true,
  description: true,
  position: true,
  stage: true,
  difficulty: true,
  estimatedMinutes: true,
  objectKey: true,
} as const;

@Injectable()
export class GuidebookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    limit: number,
    cursor?: string,
  ): Promise<{ items: GuidebookSummary[]; nextCursor: string | null }> {
    const take = limit + 1;
    const rows = await this.prisma.client.roadmap.findMany({
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        position: true,
        createdAt: true,
        userId: true,
        _count: { select: { topics: true, stages: true } },
      },
    });

    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const last = rows.pop();
      nextCursor = last?.id ?? null;
    }

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        slug: row.slug,
        position: row.position,
        createdAt: row.createdAt,
        userId: row.userId,
        topicCount: row._count.topics,
        stageCount: row._count.stages,
      })),
      nextCursor,
    };
  }

  findDetailById(id: string): Promise<GuidebookDetail | null> {
    return this.prisma.client.roadmap
      .findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          slug: true,
          position: true,
          createdAt: true,
          userId: true,
          metadata: true,
          stages: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              position: true,
              title: true,
              subtitle: true,
              byTheEnd: true,
              weekLabel: true,
              prerequisiteStage: true,
              checkpoints: {
                orderBy: { position: 'asc' },
                select: {
                  id: true,
                  stageId: true,
                  position: true,
                  task: true,
                  timeEstimate: true,
                },
              },
            },
          },
          topics: {
            orderBy: [{ stage: 'asc' }, { position: 'asc' }],
            select: topicSelect,
          },
        },
      })
      .then((row) => {
        if (!row) {
          return null;
        }
        const stages: StageRow[] = row.stages.map((stage) => ({
          id: stage.id,
          position: stage.position,
          title: stage.title,
          subtitle: stage.subtitle,
          byTheEnd: stage.byTheEnd,
          weekLabel: stage.weekLabel,
          prerequisiteStage: stage.prerequisiteStage,
          checkpoints: stage.checkpoints as CheckpointRow[],
        }));
        const topics: TopicRow[] = row.topics.map((topic) => ({
          id: topic.id,
          title: topic.title,
          description: topic.description,
          position: topic.position,
          stage: topic.stage,
          difficulty: topic.difficulty,
          estimatedMinutes: topic.estimatedMinutes,
          hasContent: Boolean(topic.objectKey),
        }));
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          slug: row.slug,
          position: row.position,
          createdAt: row.createdAt,
          userId: row.userId,
          metadata: (row.metadata as unknown as RoadmapMetadata | null) ?? null,
          stages,
          topics,
        };
      });
  }

  findTopicById(
    roadmapId: string,
    topicId: string,
  ): Promise<{ id: string; objectKey: string | null } | null> {
    return this.prisma.client.topic.findUnique({
      where: { id: topicId },
      select: { id: true, objectKey: true, roadmapId: true },
    }).then((row) => (row && row.roadmapId === roadmapId ? { id: row.id, objectKey: row.objectKey } : null));
  }

  findTopicRecord(
    id: string,
  ): Promise<{ id: string; objectKey: string | null; roadmapId: string } | null> {
    return this.prisma.client.topic.findUnique({
      where: { id },
      select: { id: true, objectKey: true, roadmapId: true },
    });
  }

  findTopicObjectKeys(roadmapId: string): Promise<string[]> {
    return this.prisma.client.topic
      .findMany({ where: { roadmapId }, select: { objectKey: true } })
      .then((rows) =>
        rows.map((row) => row.objectKey).filter((key): key is string => Boolean(key)),
      );
  }

  findStage(id: string): Promise<{ id: string; roadmapId: string; position: number } | null> {
    return this.prisma.client.stage.findUnique({
      where: { id },
      select: { id: true, roadmapId: true, position: true },
    });
  }

  clearTopicStage(roadmapId: string, stage: number): Promise<unknown> {
    return this.prisma.client.topic.updateMany({
      where: { roadmapId, stage },
      data: { stage: null },
    });
  }

  findProgress(userId: string, roadmapId: string): Promise<ProgressRow[]> {
    return this.prisma.client.topicProgress
      .findMany({
        where: { userId, topic: { roadmapId } },
        select: { topicId: true, status: true },
      })
      .then((rows) =>
        rows.map((row) => ({ topicId: row.topicId, status: row.status as TopicStatus })),
      );
  }

  upsertProgress(
    userId: string,
    topicId: string,
    status: TopicStatus,
  ): Promise<ProgressRow> {
    return this.prisma.client.topicProgress
      .upsert({
        where: { userId_topicId: { userId, topicId } },
        create: { userId, topicId, status },
        update: { status },
        select: { topicId: true, status: true },
      })
      .then((row) => ({ topicId: row.topicId, status: row.status as TopicStatus }));
  }

  findBySlug(slug: string): Promise<{ id: string } | null> {
    return this.prisma.client.roadmap.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  nextRoadmapPosition(): Promise<number> {
    return this.prisma.client.roadmap
      .aggregate({ _max: { position: true } })
      .then((result) => (result._max.position ?? 0) + 1);
  }

  nextStagePosition(roadmapId: string): Promise<number> {
    return this.prisma.client.stage
      .aggregate({ where: { roadmapId }, _max: { position: true } })
      .then((result) => (result._max.position ?? 0) + 1);
  }

  nextCheckpointPosition(stageId: string): Promise<number> {
    return this.prisma.client.checkpoint
      .aggregate({ where: { stageId }, _max: { position: true } })
      .then((result) => (result._max.position ?? 0) + 1);
  }

  nextTopicPosition(roadmapId: string): Promise<number> {
    return this.prisma.client.topic
      .aggregate({ where: { roadmapId }, _max: { position: true } })
      .then((result) => (result._max.position ?? 0) + 1);
  }

  createRoadmap(data: RoadmapCreateInput) {
    return this.prisma.client.roadmap.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description ?? null,
        position: data.position ?? 0,
        metadata: (data.metadata ?? undefined) as never,
        userId: data.userId ?? null,
      },
    });
  }

  updateRoadmap(id: string, data: RoadmapUpdateInput) {
    return this.prisma.client.roadmap.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.metadata !== undefined ? { metadata: (data.metadata ?? null) as never } : {}),
      },
    });
  }

  deleteRoadmap(id: string) {
    return this.prisma.client.roadmap.delete({ where: { id } });
  }

  createStage(data: StageCreateInput) {
    return this.prisma.client.stage.create({
      data: {
        roadmapId: data.roadmapId,
        position: data.position,
        title: data.title,
        subtitle: data.subtitle ?? null,
        byTheEnd: data.byTheEnd ?? null,
        weekLabel: data.weekLabel ?? null,
        prerequisiteStage: data.prerequisiteStage ?? null,
      },
    });
  }

  updateStage(id: string, data: StageUpdateInput) {
    return this.prisma.client.stage.update({
      where: { id },
      data: {
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
        ...(data.byTheEnd !== undefined ? { byTheEnd: data.byTheEnd } : {}),
        ...(data.weekLabel !== undefined ? { weekLabel: data.weekLabel } : {}),
        ...(data.prerequisiteStage !== undefined
          ? { prerequisiteStage: data.prerequisiteStage }
          : {}),
      },
    });
  }

  deleteStage(id: string) {
    return this.prisma.client.stage.delete({ where: { id } });
  }

  createCheckpoint(data: CheckpointCreateInput) {
    return this.prisma.client.checkpoint.create({
      data: {
        stageId: data.stageId,
        position: data.position,
        task: data.task,
        timeEstimate: data.timeEstimate ?? null,
      },
    });
  }

  updateCheckpoint(id: string, data: CheckpointUpdateInput) {
    return this.prisma.client.checkpoint.update({
      where: { id },
      data: {
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.task !== undefined ? { task: data.task } : {}),
        ...(data.timeEstimate !== undefined ? { timeEstimate: data.timeEstimate } : {}),
      },
    });
  }

  deleteCheckpoint(id: string) {
    return this.prisma.client.checkpoint.delete({ where: { id } });
  }

  createTopic(data: TopicCreateInput) {
    return this.prisma.client.topic.create({
      data: {
        roadmapId: data.roadmapId,
        position: data.position,
        title: data.title,
        description: data.description ?? null,
        stage: data.stage ?? null,
        difficulty: data.difficulty ?? null,
        estimatedMinutes: data.estimatedMinutes ?? null,
        objectKey: data.objectKey ?? null,
      },
    });
  }

  updateTopic(id: string, data: TopicUpdateInput) {
    return this.prisma.client.topic.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.stage !== undefined ? { stage: data.stage } : {}),
        ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
        ...(data.estimatedMinutes !== undefined
          ? { estimatedMinutes: data.estimatedMinutes }
          : {}),
        ...(data.objectKey !== undefined ? { objectKey: data.objectKey } : {}),
      },
    });
  }

  deleteTopic(id: string) {
    return this.prisma.client.topic.delete({ where: { id } });
  }
}
