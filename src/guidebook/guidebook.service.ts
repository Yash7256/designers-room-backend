import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto.js';
import { CreateRoadmapDto } from './dto/create-roadmap.dto.js';
import { CreateStageDto } from './dto/create-stage.dto.js';
import { CreateTopicDto } from './dto/create-topic.dto.js';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto.js';
import { UpdateRoadmapDto } from './dto/update-roadmap.dto.js';
import { UpdateStageDto } from './dto/update-stage.dto.js';
import { UpdateTopicDto } from './dto/update-topic.dto.js';
import { GuidebookRepository } from './guidebook.repository.js';
import {
  GuidebookDetail,
  MarkdownUpload,
  RoadmapMetadata,
  TopicMetadata,
  TopicStatus,
} from './guidebook.types.js';
import { R2StorageService } from '../storage/r2-storage.service.js';

export const MAX_MARKDOWN_BYTES = 512 * 1024;
export const MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';

const ALLOWED_EXTENSIONS = ['.md', '.markdown'];
const SLUG_MAX_LENGTH = 80;

export interface TopicContent {
  content: string;
  contentType: string;
  sizeBytes: number;
  etag: string;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
}

@Injectable()
export class GuidebookService {
  constructor(
    private readonly repository: GuidebookRepository,
    private readonly storage: R2StorageService,
  ) {}

  list(limit: number, cursor?: string) {
    return this.repository.findAll(limit, cursor);
  }

  async getDetail(id: string): Promise<GuidebookDetail> {
    const detail = await this.repository.findDetailById(id);
    if (!detail) {
      throw new NotFoundException(`Guidebook ${id} not found`);
    }
    return detail;
  }

  async getTopicContent(roadmapId: string, topicId: string): Promise<TopicContent> {
    const topic = await this.repository.findTopicContent(roadmapId, topicId);
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    if (topic.document) {
      return {
        content: topic.document.body,
        contentType: topic.document.contentType,
        sizeBytes: topic.document.sizeBytes,
        etag: `"${createHash('sha1').update(topic.document.body).digest('hex')}"`,
      };
    }
    if (!topic.objectKey) {
      throw new NotFoundException('This topic has no document yet');
    }
    const object = await this.storage.getObject(topic.objectKey);
    return {
      content: object.body,
      contentType: MARKDOWN_CONTENT_TYPE,
      sizeBytes: Buffer.byteLength(object.body, 'utf-8'),
      etag: `"${createHash('sha1').update(object.body).digest('hex')}"`,
    };
  }

  getProgress(roadmapId: string, userId: string) {
    return this.repository.findProgress(userId, roadmapId);
  }

  async setProgress(
    roadmapId: string,
    topicId: string,
    userId: string,
    status: TopicStatus,
  ) {
    const topic = await this.repository.findTopicById(roadmapId, topicId);
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    return this.repository.upsertProgress(userId, topicId, status);
  }

  async createRoadmap(dto: CreateRoadmapDto, userId?: string) {
    const title = this.validateTitle(dto.title);
    const slug = await this.resolveSlug(dto.slug ?? title);
    const position = dto.position ?? (await this.repository.nextRoadmapPosition());
    return this.repository.createRoadmap({
      title,
      slug,
      description: dto.description ?? null,
      position,
      metadata: (dto.metadata ?? null) as RoadmapMetadata | null,
      userId: userId ?? null,
    });
  }

  async updateRoadmap(id: string, dto: UpdateRoadmapDto) {
    const data: Parameters<GuidebookRepository['updateRoadmap']>[1] = {};
    if (dto.title !== undefined) {
      data.title = this.validateTitle(dto.title);
    }
    if (dto.slug !== undefined) {
      data.slug = await this.resolveSlug(dto.slug, id);
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim() ? dto.description.trim() : null;
    }
    if (dto.position !== undefined) {
      data.position = dto.position;
    }
    if (dto.metadata !== undefined) {
      data.metadata = (dto.metadata ?? null) as RoadmapMetadata | null;
    }
    return this.repository.updateRoadmap(id, data);
  }

  async deleteRoadmap(id: string) {
    const objectKeys = await this.repository.findTopicObjectKeys(id);
    await this.repository.deleteRoadmap(id);
    for (const key of objectKeys) {
      await this.storage.deleteObject(key);
    }
  }

  async createStage(roadmapId: string, dto: CreateStageDto) {
    await this.getDetail(roadmapId);
    const position = dto.position ?? (await this.repository.nextStagePosition(roadmapId));
    return this.repository.createStage({
      roadmapId,
      position,
      title: this.validateTitle(dto.title),
      subtitle: dto.subtitle ?? null,
      byTheEnd: dto.byTheEnd ?? null,
      weekLabel: dto.weekLabel ?? null,
      prerequisiteStage: dto.prerequisiteStage ?? null,
    });
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    const data: Parameters<GuidebookRepository['updateStage']>[1] = {};
    if (dto.title !== undefined) {
      data.title = this.validateTitle(dto.title);
    }
    if (dto.subtitle !== undefined) {
      data.subtitle = dto.subtitle;
    }
    if (dto.byTheEnd !== undefined) {
      data.byTheEnd = dto.byTheEnd;
    }
    if (dto.weekLabel !== undefined) {
      data.weekLabel = dto.weekLabel;
    }
    if (dto.position !== undefined) {
      data.position = dto.position;
    }
    if (dto.prerequisiteStage !== undefined) {
      data.prerequisiteStage = dto.prerequisiteStage;
    }
    return this.repository.updateStage(id, data);
  }

  async deleteStage(id: string) {
    const stage = await this.repository.findStage(id);
    if (!stage) {
      throw new NotFoundException(`Stage ${id} not found`);
    }
    await this.repository.clearTopicStage(stage.roadmapId, stage.position);
    return this.repository.deleteStage(id);
  }

  async createCheckpoint(stageId: string, dto: CreateCheckpointDto) {
    const stage = await this.repository.findStage(stageId);
    if (!stage) {
      throw new NotFoundException(`Stage ${stageId} not found`);
    }
    const position = dto.position ?? (await this.repository.nextCheckpointPosition(stageId));
    return this.repository.createCheckpoint({
      stageId,
      position,
      task: this.validateTitle(dto.task),
      timeEstimate: dto.timeEstimate ?? null,
    });
  }

  async updateCheckpoint(id: string, dto: UpdateCheckpointDto) {
    const data: Parameters<GuidebookRepository['updateCheckpoint']>[1] = {};
    if (dto.task !== undefined) {
      data.task = this.validateTitle(dto.task);
    }
    if (dto.timeEstimate !== undefined) {
      data.timeEstimate = dto.timeEstimate;
    }
    if (dto.position !== undefined) {
      data.position = dto.position;
    }
    return this.repository.updateCheckpoint(id, data);
  }

  deleteCheckpoint(id: string) {
    return this.repository.deleteCheckpoint(id);
  }

  async createTopic(roadmapId: string, dto: CreateTopicDto) {
    await this.getDetail(roadmapId);
    const title = this.validateTitle(dto.title);
    const position = dto.position ?? (await this.repository.nextTopicPosition(roadmapId));
    const slug = await this.resolveTopicSlug(roadmapId, dto.slug ?? title);
    return this.repository.createTopic({
      roadmapId,
      position,
      title,
      slug,
      description: dto.description ?? null,
      stage: dto.stage ?? null,
      difficulty: dto.difficulty ?? null,
      estimatedMinutes: dto.estimatedMinutes ?? null,
      metadata: (dto.metadata ?? null) as TopicMetadata | null,
    });
  }

  async updateTopic(id: string, dto: UpdateTopicDto) {
    const data: Parameters<GuidebookRepository['updateTopic']>[1] = {};
    if (dto.title !== undefined) {
      data.title = this.validateTitle(dto.title);
    }
    if (dto.slug !== undefined) {
      const topic = await this.repository.findTopicRecord(id);
      if (!topic) {
        throw new NotFoundException(`Topic ${id} not found`);
      }
      data.slug = await this.resolveTopicSlug(topic.roadmapId, dto.slug, id);
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim() ? dto.description.trim() : null;
    }
    if (dto.position !== undefined) {
      data.position = dto.position;
    }
    if (dto.stage !== undefined) {
      data.stage = dto.stage;
    }
    if (dto.difficulty !== undefined) {
      data.difficulty = dto.difficulty;
    }
    if (dto.estimatedMinutes !== undefined) {
      data.estimatedMinutes = dto.estimatedMinutes;
    }
    if (dto.metadata !== undefined) {
      data.metadata = (dto.metadata ?? null) as TopicMetadata | null;
    }
    return this.repository.updateTopic(id, data);
  }

  async deleteTopic(id: string) {
    const topic = await this.repository.findTopicRecord(id);
    if (!topic) {
      throw new NotFoundException(`Topic ${id} not found`);
    }
    const deleted = await this.repository.deleteTopic(id);
    if (topic.objectKey) {
      await this.storage.deleteObject(topic.objectKey);
    }
    return deleted;
  }

  async uploadTopicContent(
    roadmapId: string,
    topicId: string,
    file: MarkdownUpload | undefined,
  ) {
    const topic = await this.repository.findTopicById(roadmapId, topicId);
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    const upload = this.validateUpload(file);
    const body = upload.buffer.toString('utf-8');
    const sizeBytes = upload.buffer.byteLength;
    await this.repository.upsertTopicDocument(topicId, {
      body,
      contentType: MARKDOWN_CONTENT_TYPE,
      sizeBytes,
      contentHash: createHash('sha256').update(body).digest('hex'),
    });
    if (topic.objectKey) {
      await this.repository.updateTopic(topicId, { objectKey: null });
      await this.storage.deleteObject(topic.objectKey);
    }
    return { objectKey: null, sizeBytes };
  }

  async deleteTopicContent(roadmapId: string, topicId: string) {
    const topic = await this.repository.findTopicById(roadmapId, topicId);
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    await this.repository.deleteTopicDocument(topicId);
    if (topic.objectKey) {
      await this.repository.updateTopic(topicId, { objectKey: null });
      await this.storage.deleteObject(topic.objectKey);
    }
  }

  private validateTitle(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException('A title is required');
    }
    return trimmed;
  }

  private validateUpload(file: MarkdownUpload | undefined): MarkdownUpload {
    if (!file || !file.buffer) {
      throw new BadRequestException('A Markdown file is required');
    }
    if (file.size > MAX_MARKDOWN_BYTES) {
      throw new PayloadTooLargeException('Markdown files must be 512 KB or smaller');
    }
    const name = (file.originalname ?? '').toLowerCase();
    const extension = name.slice(name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new BadRequestException('Only .md and .markdown files are supported');
    }
    if (file.buffer.includes(0)) {
      throw new BadRequestException('The uploaded file is not valid Markdown text');
    }
    const text = file.buffer.toString('utf-8');
    if (Buffer.byteLength(text, 'utf-8') !== file.buffer.byteLength) {
      throw new BadRequestException('The uploaded file must be UTF-8 encoded text');
    }
    return file;
  }

  private async resolveSlug(base: string, excludeId?: string): Promise<string> {
    const normalized = slugify(base) || 'guidebook';
    let candidate = normalized;
    let suffix = 2;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const existing = await this.repository.findBySlug(candidate);
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      candidate = `${normalized.slice(0, SLUG_MAX_LENGTH - 4)}-${suffix}`;
      suffix += 1;
    }
    throw new ConflictException('Could not allocate a unique slug');
  }

  private async resolveTopicSlug(
    roadmapId: string,
    base: string,
    excludeId?: string,
  ): Promise<string> {
    const normalized = slugify(base) || 'topic';
    let candidate = normalized;
    let suffix = 2;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const existing = await this.repository.findTopicBySlug(roadmapId, candidate);
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      candidate = `${normalized.slice(0, SLUG_MAX_LENGTH - 4)}-${suffix}`;
      suffix += 1;
    }
    throw new ConflictException('Could not allocate a unique topic slug');
  }
}
