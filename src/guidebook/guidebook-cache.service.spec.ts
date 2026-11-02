import { describe, expect, it, vi } from 'vitest';
import { GuidebookCacheService } from './guidebook-cache.service.js';

function cache(ttl = 60): GuidebookCacheService {
  return new GuidebookCacheService({
    get: vi.fn().mockReturnValue(ttl),
  } as never);
}

describe('GuidebookCacheService', () => {
  it('serves hits without loading again and computes JSON/ETag once', async () => {
    const service = cache();
    const load = vi.fn().mockResolvedValue({ items: ['one'] });

    const first = await service.getList('20:', load);
    const second = await service.getList('20:', load);

    expect(load).toHaveBeenCalledOnce();
    expect(second).toBe(first);
    expect(first.json).toBe('{"items":["one"]}');
    expect(first.etag).toMatch(/^"[0-9a-f]{40}"$/);
  });

  it('expires entries and disables caching at TTL zero', async () => {
    vi.useFakeTimers();
    const service = cache(1);
    const load = vi.fn().mockResolvedValue({ value: 1 });

    await service.getDetail('r1', load);
    vi.advanceTimersByTime(1001);
    await service.getDetail('r1', load);
    expect(load).toHaveBeenCalledTimes(2);

    const disabled = cache(0);
    const disabledLoad = vi.fn().mockResolvedValue({ value: 1 });
    await disabled.getDetail('r1', disabledLoad);
    await disabled.getDetail('r1', disabledLoad);
    expect(disabledLoad).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('shares concurrent misses and does not cache rejected loads', async () => {
    const service = cache();
    let resolve!: (value: { value: number }) => void;
    const load = vi.fn().mockReturnValue(new Promise<{ value: number }>((done) => { resolve = done; }));
    const first = service.getDetail('r1', load);
    const second = service.getDetail('r1', load);
    resolve({ value: 1 });
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(load).toHaveBeenCalledOnce();

    const failing = vi.fn().mockRejectedValue(new Error('not found'));
    await expect(service.getDetail('missing', failing)).rejects.toThrow('not found');
    await expect(service.getDetail('missing', failing)).rejects.toThrow('not found');
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it('invalidates all cached categories', async () => {
    const service = cache();
    const load = vi.fn().mockResolvedValue({ value: 1 });
    await service.getList('k', load);
    await service.getDetail('k', load);
    await service.getContent('k', vi.fn().mockResolvedValue({ content: 'x', contentType: 'text/plain', sizeBytes: 1, etag: '"x"' }));
    service.invalidateAll();
    await service.getList('k', load);
    await service.getDetail('k', load);
    expect(load).toHaveBeenCalledTimes(4);
  });
});
