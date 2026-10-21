import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { CreateGuidebookTopicDto } from './dto/create-guidebook-topic.dto.js';
import { UpdateGuidebookTopicDto } from './dto/update-guidebook-topic.dto.js';
import { GuidebookRepository, GuidebookTopicUpdateInput } from './guidebook.repository.js';
import { GuidebookTopicListItem, GuidebookTopicRow, MarkdownUpload } from './guidebook.types.js';
import { R2StorageService } from './r2-storage.service.js';

export const MAX_MARKDOWN_BYTES = 512 * 1024;
export const MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';

const ALLOWED_EXTENSIONS = ['.md', '.markdown'];
const SLUG_MAX_LENGTH = 80;

export interface GuidebookTopicDetail {
  id: string;
  title: string;
  slug: string;
  position: number;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuidebookContent {
  topic: GuidebookTopicDetail;
  content: string;
  contentType: string;
  sizeBytes: number;
  etag: string;
}

function toDetail(row: GuidebookTopicRow): GuidebookTopicDetail {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    position: row.position,
    summary: row.summary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toListItem(row: GuidebookTopicRow): GuidebookTopicListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    position: row.position,
    summary: row.summary,
    updatedAt: row.updatedAt,
  };
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

  async list(): Promise<GuidebookTopicListItem[]> {
    const rows = await this.repository.findAll();
    return rows.map(toListItem);
  }

  async getTopic(id: string): Promise<GuidebookTopicDetail> {
    return toDetail(await this.findTopicOrFail(id));
  }

  async getContent(id: string): Promise<GuidebookContent> {
    const topic = await this.findTopicOrFail(id);
    const object = await this.storage.getObject(topic.objectKey);
    return {
      topic: toDetail(topic),
      content: object.body,
      contentType: MARKDOWN_CONTENT_TYPE,
      sizeBytes: Buffer.byteLength(object.body, 'utf-8'),
      etag: `"${createHash('sha1').update(object.body).digest('hex')}"`,
    };
  }

  async createTopic(
    dto: CreateGuidebookTopicDto,
    file: MarkdownUpload | undefined,
  ): Promise<GuidebookTopicDetail> {
    const upload = this.validateUpload(file);
    const title = this.validateTitle(dto.title);
    const slug = await this.resolveSlug(dto.slug ?? title);
    const objectKey = this.buildObjectKey();
    await this.storage.putObject(objectKey, upload.buffer, MARKDOWN_CONTENT_TYPE);
    try {
      const position = dto.position ?? (await this.repository.nextPosition());
      const row = await this.repository.create({
        title,
        slug,
        position,
        summary: dto.summary?.trim() ? dto.summary.trim() : null,
        objectKey,
      });
      return toDetail(row);
    } catch (error) {
      await this.storage.deleteObject(objectKey);
      throw error;
    }
  }

  async updateTopic(
    id: string,
    dto: UpdateGuidebookTopicDto,
    file: MarkdownUpload | undefined,
  ): Promise<GuidebookTopicDetail> {
    const existing = await this.findTopicOrFail(id);
    const data: GuidebookTopicUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = this.validateTitle(dto.title);
    }
    if (dto.summary !== undefined) {
      data.summary = dto.summary.trim() ? dto.summary.trim() : null;
    }
    if (dto.position !== undefined) {
      data.position = dto.position;
    }
    if (dto.slug !== undefined) {
      data.slug = await this.resolveSlug(dto.slug, id);
    }

    if (file) {
      const upload = this.validateUpload(file);
      const objectKey = this.buildObjectKey();
      await this.storage.putObject(objectKey, upload.buffer, MARKDOWN_CONTENT_TYPE);
      data.objectKey = objectKey;
      try {
        const row = await this.repository.update(id, data);
        await this.storage.deleteObject(existing.objectKey);
        return toDetail(row);
      } catch (error) {
        await this.storage.deleteObject(objectKey);
        throw error;
      }
    }

    return toDetail(await this.repository.update(id, data));
  }

  async deleteTopic(id: string): Promise<GuidebookTopicDetail> {
    const existing = await this.findTopicOrFail(id);
    const row = await this.repository.delete(id);
    await this.storage.deleteObject(existing.objectKey);
    return toDetail(row);
  }

  async reorder(items: { id: string; position: number }[]): Promise<GuidebookTopicDetail[]> {
    const rows = await this.repository.updatePositions(items);
    return rows.map(toDetail);
  }

  private async findTopicOrFail(id: string): Promise<GuidebookTopicRow> {
    const topic = await this.repository.findById(id);
    if (!topic) {
      throw new NotFoundException(`Guidebook topic ${id} not found`);
    }
    return topic;
  }

  private validateTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new BadRequestException('Title must not be blank');
    }
    return trimmed;
  }

  private buildObjectKey(): string {
    return `guidebook/topics/${randomUUID()}.md`;
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
    const normalized = slugify(base) || 'topic';
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
}
