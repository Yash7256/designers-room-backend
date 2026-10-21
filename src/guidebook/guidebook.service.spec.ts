import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { GuidebookRepository } from './guidebook.repository.js';
import { GuidebookService } from './guidebook.service.js';
import { GuidebookDetail, MarkdownUpload } from './guidebook.types.js';
import { R2StorageService } from '../storage/r2-storage.service.js';

function makeDetail(overrides: Partial<GuidebookDetail> = {}): GuidebookDetail {
  return {
    id: 'roadmap-1',
    title: 'Product design',
    description: null,
    slug: 'product-design',
    position: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: null,
    metadata: null,
    stages: [],
    topics: [],
    ...overrides,
  };
}

function makeUpload(overrides: Partial<MarkdownUpload> = {}): MarkdownUpload {
  const body = '# Design fundamentals\n\nSome content.\n';
  return {
    originalname: 'design-fundamentals.md',
    mimetype: 'text/markdown',
    size: Buffer.byteLength(body),
    buffer: Buffer.from(body, 'utf-8'),
    ...overrides,
  };
}

function createService(detail: GuidebookDetail | null = makeDetail()) {
  const findAll = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
  const findDetailById = vi.fn().mockResolvedValue(detail);
  const findTopicById = vi
    .fn()
    .mockResolvedValue({ id: 'topic-1', objectKey: 'roadmaps/r1/topics/t1/abc.md' });
  const findTopicRecord = vi
    .fn()
    .mockResolvedValue({ id: 'topic-1', objectKey: 'roadmaps/r1/topics/t1/abc.md', roadmapId: 'r1' });
  const findTopicObjectKeys = vi.fn().mockResolvedValue(['roadmaps/r1/topics/t1/abc.md']);
  const findStage = vi.fn().mockResolvedValue({ id: 'stage-1', roadmapId: 'r1', position: 1 });
  const clearTopicStage = vi.fn().mockResolvedValue({ count: 1 });
  const findProgress = vi.fn().mockResolvedValue([]);
  const upsertProgress = vi
    .fn()
    .mockImplementation(async (_userId: string, topicId: string, status: string) => ({
      topicId,
      status,
    }));
  const findBySlug = vi.fn().mockResolvedValue(null);
  const nextRoadmapPosition = vi.fn().mockResolvedValue(3);
  const nextStagePosition = vi.fn().mockResolvedValue(2);
  const nextCheckpointPosition = vi.fn().mockResolvedValue(1);
  const nextTopicPosition = vi.fn().mockResolvedValue(7);
  const createRoadmap = vi.fn(async (data: { title: string; slug: string }) => ({
    id: 'roadmap-2',
    ...data,
  }));
  const updateRoadmap = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }));
  const deleteRoadmap = vi.fn().mockResolvedValue({ id: 'roadmap-1' });
  const createStage = vi.fn(async (data: { title: string }) => ({ id: 'stage-2', ...data }));
  const updateStage = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }));
  const deleteStage = vi.fn().mockResolvedValue({ id: 'stage-1' });
  const createCheckpoint = vi.fn(async (data: { task: string }) => ({ id: 'checkpoint-1', ...data }));
  const updateCheckpoint = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }));
  const deleteCheckpoint = vi.fn().mockResolvedValue({ id: 'checkpoint-1' });
  const createTopic = vi.fn(async (data: { title: string }) => ({ id: 'topic-2', ...data }));
  const updateTopic = vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data }));
  const deleteTopic = vi.fn().mockResolvedValue({ id: 'topic-1' });

  const putObject = vi.fn().mockResolvedValue(undefined);
  const getObject = vi
    .fn()
    .mockResolvedValue({ body: '# Design fundamentals\n', contentType: 'text/markdown', sizeBytes: 25 });
  const deleteObject = vi.fn().mockResolvedValue(undefined);

  const repository = {
    findAll,
    findDetailById,
    findTopicById,
    findTopicRecord,
    findTopicObjectKeys,
    findStage,
    clearTopicStage,
    findProgress,
    upsertProgress,
    findBySlug,
    nextRoadmapPosition,
    nextStagePosition,
    nextCheckpointPosition,
    nextTopicPosition,
    createRoadmap,
    updateRoadmap,
    deleteRoadmap,
    createStage,
    updateStage,
    deleteStage,
    createCheckpoint,
    updateCheckpoint,
    deleteCheckpoint,
    createTopic,
    updateTopic,
    deleteTopic,
  } as unknown as GuidebookRepository;
  const storage = {
    putObject,
    getObject,
    deleteObject,
  } as unknown as R2StorageService;

  return {
    service: new GuidebookService(repository, storage),
    repository: {
      createRoadmap,
      updateRoadmap,
      createStage,
      createTopic,
      updateTopic,
      deleteTopic,
      clearTopicStage,
      findBySlug,
      findStage,
      findTopicById,
      findTopicRecord,
      findTopicObjectKeys,
      nextRoadmapPosition,
      nextStagePosition,
      nextTopicPosition,
      upsertProgress,
    },
    putObject,
    getObject,
    deleteObject,
  };
}

describe('GuidebookService', () => {
  it('returns the paginated guidebook list', async () => {
    const { service } = createService();

    const result = await service.list(20, undefined);

    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it('throws when the guidebook does not exist', async () => {
    const { service } = createService(null);

    await expect(service.getDetail('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the markdown content with an etag', async () => {
    const { service } = createService();

    const result = await service.getTopicContent('roadmap-1', 'topic-1');

    expect(result.content).toBe('# Design fundamentals\n');
    expect(result.contentType).toBe('text/markdown; charset=utf-8');
    expect(result.etag).toMatch(/^"[0-9a-f]{40}"$/);
  });

  it('throws when a topic has no document', async () => {
    const { service, repository } = createService();
    repository.findTopicById.mockResolvedValue({ id: 'topic-1', objectKey: null });

    await expect(service.getTopicContent('roadmap-1', 'topic-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('stores the progress of the signed in user', async () => {
    const { service, repository } = createService();

    const result = await service.setProgress('roadmap-1', 'topic-1', 'user-1', 'done');

    expect(repository.upsertProgress).toHaveBeenCalledWith('user-1', 'topic-1', 'done');
    expect(result).toEqual({ topicId: 'topic-1', status: 'done' });
  });

  it('throws when the progress target topic does not exist', async () => {
    const { service, repository } = createService();
    repository.findTopicById.mockResolvedValue(null);

    await expect(
      service.setProgress('roadmap-1', 'missing', 'user-1', 'done'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('derives a slug from the title', async () => {
    const { service, repository } = createService();

    await service.createRoadmap({ title: 'Product Design 101' });

    expect(repository.createRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Product Design 101', slug: 'product-design-101' }),
    );
  });

  it('keeps slugs unique', async () => {
    const { service, repository } = createService();
    repository.findBySlug.mockResolvedValueOnce({ id: 'roadmap-1' });

    await service.createRoadmap({ title: 'Product design' });

    expect(repository.createRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'product-design-2' }),
    );
  });

  it('appends a new stage to the end of the guidebook', async () => {
    const { service, repository } = createService();

    await service.createStage('roadmap-1', { title: 'Stage two' });

    expect(repository.createStage).toHaveBeenCalledWith(
      expect.objectContaining({ roadmapId: 'roadmap-1', position: 2, title: 'Stage two' }),
    );
  });

  it('clears the stage of its topics when a stage is deleted', async () => {
    const { service, repository } = createService();

    await service.deleteStage('stage-1');

    expect(repository.clearTopicStage).toHaveBeenCalledWith('r1', 1);
  });

  it('appends a new topic to the end of the guidebook', async () => {
    const { service, repository } = createService();

    await service.createTopic('roadmap-1', { title: 'Design fundamentals' });

    expect(repository.createTopic).toHaveBeenCalledWith(
      expect.objectContaining({ roadmapId: 'roadmap-1', position: 7 }),
    );
  });

  it('rejects a missing upload', async () => {
    const { service } = createService();

    await expect(
      service.uploadTopicContent('roadmap-1', 'topic-1', undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects files that are not markdown', async () => {
    const { service } = createService();

    await expect(
      service.uploadTopicContent(
        'roadmap-1',
        'topic-1',
        makeUpload({ originalname: 'payload.exe' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects binary content', async () => {
    const { service } = createService();

    await expect(
      service.uploadTopicContent(
        'roadmap-1',
        'topic-1',
        makeUpload({ buffer: Buffer.from([0x89, 0x50, 0x00, 0x01]) }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects uploads above the size limit', async () => {
    const { service } = createService();

    await expect(
      service.uploadTopicContent(
        'roadmap-1',
        'topic-1',
        makeUpload({ size: 512 * 1024 + 1 }),
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('stores the document under a server generated key', async () => {
    const { service, putObject, repository } = createService();

    const result = await service.uploadTopicContent('roadmap-1', 'topic-1', makeUpload());

    const put = putObject.mock.calls[0];
    expect(put[0]).toMatch(/^roadmaps\/roadmap-1\/topics\/topic-1\/[0-9a-f-]{36}\.md$/);
    expect(put[1]).toBeInstanceOf(Buffer);
    expect(put[2]).toBe('text/markdown; charset=utf-8');
    expect(repository.updateTopic).toHaveBeenCalledWith('topic-1', { objectKey: put[0] });
    expect(result.objectKey).toBe(put[0]);
  });

  it('removes the stored object when the database write fails', async () => {
    const { service, repository, deleteObject } = createService();
    repository.updateTopic.mockRejectedValueOnce(new Error('database is down'));

    await expect(
      service.uploadTopicContent('roadmap-1', 'topic-1', makeUpload()),
    ).rejects.toThrow('database is down');
    expect(deleteObject).toHaveBeenCalledOnce();
  });

  it('removes the previous document when the file is replaced', async () => {
    const { service, deleteObject, putObject } = createService();

    await service.uploadTopicContent('roadmap-1', 'topic-1', makeUpload());

    expect(deleteObject).toHaveBeenCalledWith('roadmaps/r1/topics/t1/abc.md');
    expect(putObject).toHaveBeenCalledOnce();
  });

  it('deletes the stored object when a topic is removed', async () => {
    const { service, deleteObject } = createService();

    await service.deleteTopic('topic-1');

    expect(deleteObject).toHaveBeenCalledWith('roadmaps/r1/topics/t1/abc.md');
  });

  it('deletes the stored objects when a guidebook is removed', async () => {
    const { service, deleteObject } = createService();

    await service.deleteRoadmap('roadmap-1');

    expect(deleteObject).toHaveBeenCalledWith('roadmaps/r1/topics/t1/abc.md');
  });

  it('clears the document reference when the content is removed', async () => {
    const { service, repository, deleteObject } = createService();

    await service.deleteTopicContent('roadmap-1', 'topic-1');

    expect(deleteObject).toHaveBeenCalledWith('roadmaps/r1/topics/t1/abc.md');
    expect(repository.updateTopic).toHaveBeenCalledWith('topic-1', { objectKey: null });
  });
});
