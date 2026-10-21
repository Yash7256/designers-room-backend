import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { GuidebookRepository } from './guidebook.repository.js';
import { GuidebookService } from './guidebook.service.js';
import { GuidebookTopicRow, MarkdownUpload } from './guidebook.types.js';
import { R2StorageService } from './r2-storage.service.js';

function makeRow(overrides: Partial<GuidebookTopicRow> = {}): GuidebookTopicRow {
  return {
    id: 'topic-1',
    title: 'Design fundamentals',
    slug: 'design-fundamentals',
    position: 0,
    summary: null,
    objectKey: 'guidebook/topics/abc.md',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
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

function createService(row: GuidebookTopicRow | null = makeRow()) {
  const findAll = vi.fn().mockResolvedValue(row ? [row] : []);
  const findById = vi.fn().mockResolvedValue(row);
  const findBySlug = vi.fn().mockResolvedValue(null);
  const nextPosition = vi.fn().mockResolvedValue(7);
  const create = vi.fn(async (data: Partial<GuidebookTopicRow>) => makeRow(data));
  const update = vi.fn(async (id: string, data: Partial<GuidebookTopicRow>) => makeRow({ id, ...data }));
  const deleteTopic = vi.fn(async (id: string) => makeRow({ id }));
  const updatePositions = vi.fn(async (items: { id: string; position: number }[]) =>
    items.map((item) => makeRow({ id: item.id, position: item.position })),
  );
  const putObject = vi.fn().mockResolvedValue(undefined);
  const getObject = vi
    .fn()
    .mockResolvedValue({ body: '# Design fundamentals\n', contentType: 'text/markdown', sizeBytes: 25 });
  const deleteObject = vi.fn().mockResolvedValue(undefined);

  const repository = {
    findAll,
    findById,
    findBySlug,
    nextPosition,
    create,
    update,
    delete: deleteTopic,
    updatePositions,
  } as unknown as GuidebookRepository;
  const storage = {
    putObject,
    getObject,
    deleteObject,
  } as unknown as R2StorageService;

  return {
    service: new GuidebookService(repository, storage),
    repository,
    storage,
    create,
    findBySlug,
    putObject,
    deleteObject,
  };
}

describe('GuidebookService', () => {
  it('rejects a missing upload', async () => {
    const { service } = createService();

    await expect(
      service.createTopic({ title: 'Design fundamentals' }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects files that are not markdown', async () => {
    const { service } = createService();

    await expect(
      service.createTopic(
        { title: 'Design fundamentals' },
        makeUpload({ originalname: 'payload.exe' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects binary content', async () => {
    const { service } = createService();

    await expect(
      service.createTopic(
        { title: 'Design fundamentals' },
        makeUpload({ buffer: Buffer.from([0x89, 0x50, 0x00, 0x01]) }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects uploads above the size limit', async () => {
    const { service } = createService();

    await expect(
      service.createTopic(
        { title: 'Design fundamentals' },
        makeUpload({ size: 512 * 1024 + 1 }),
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('stores the document under a server generated key', async () => {
    const { service, create, putObject } = createService();

    const topic = await service.createTopic(
      { title: '  Design fundamentals  ' },
      makeUpload(),
    );

    const put = putObject.mock.calls[0];
    expect(put[0]).toMatch(/^guidebook\/topics\/[0-9a-f-]{36}\.md$/);
    expect(put[1]).toBeInstanceOf(Buffer);
    expect(put[2]).toBe('text/markdown; charset=utf-8');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Design fundamentals',
        objectKey: put[0],
        position: 7,
      }),
    );
    expect('objectKey' in topic).toBe(false);
  });

  it('keeps slugs unique', async () => {
    const { service, create, findBySlug } = createService();
    findBySlug.mockResolvedValueOnce(makeRow());

    await service.createTopic({ title: 'Design fundamentals' }, makeUpload());

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'design-fundamentals-2' }),
    );
  });

  it('removes the stored object when the database write fails', async () => {
    const { service, create, deleteObject } = createService();
    create.mockRejectedValueOnce(new Error('database is down'));

    await expect(
      service.createTopic({ title: 'Design fundamentals' }, makeUpload()),
    ).rejects.toThrow('database is down');
    expect(deleteObject).toHaveBeenCalledOnce();
  });

  it('returns the markdown content with an etag', async () => {
    const { service } = createService();

    const result = await service.getContent('topic-1');

    expect(result.content).toBe('# Design fundamentals\n');
    expect(result.contentType).toBe('text/markdown; charset=utf-8');
    expect(result.etag).toMatch(/^"[0-9a-f]{40}"$/);
  });

  it('throws when the topic does not exist', async () => {
    const { service } = createService(null);

    await expect(service.getTopic('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes the stored object when a topic is removed', async () => {
    const { service, deleteObject } = createService();

    await service.deleteTopic('topic-1');

    expect(deleteObject).toHaveBeenCalledWith('guidebook/topics/abc.md');
  });

  it('removes the previous document when the file is replaced', async () => {
    const { service, deleteObject, putObject } = createService();

    await service.updateTopic('topic-1', { title: 'Updated' }, makeUpload());

    expect(deleteObject).toHaveBeenCalledWith('guidebook/topics/abc.md');
    expect(putObject).toHaveBeenCalledOnce();
  });

  it('lists topics without leaking the object key', async () => {
    const { service } = createService();

    const items = await service.list();

    expect(items).toHaveLength(1);
    expect('objectKey' in (items[0] ?? {})).toBe(false);
    expect(items[0]?.slug).toBe('design-fundamentals');
  });
});
