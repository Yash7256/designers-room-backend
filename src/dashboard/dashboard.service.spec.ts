import { describe, expect, it, vi } from 'vitest';
import type { AuthzCacheService } from '../auth/authz-cache.service.js';
import type { GuidebookRepository } from '../guidebook/guidebook.repository.js';
import type { GuidebookService } from '../guidebook/guidebook.service.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  it('loads the user, cached roadmaps, and all progress in parallel', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      role: 'USER',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      sessionsRevokedAt: null,
    };
    const authzCache = { get: vi.fn().mockResolvedValue(user) };
    const list = vi.fn().mockResolvedValue({
      value: { items: [{ id: 'roadmap-1' }], nextCursor: null },
      json: '{}',
      etag: '"etag"',
    });
    const findAllProgress = vi.fn().mockResolvedValue([
      { roadmapId: 'roadmap-1', topicId: 'topic-1', status: 'done' },
      { roadmapId: 'roadmap-2', topicId: 'topic-2', status: 'in-progress' },
    ]);
    const service = new DashboardService(
      authzCache as unknown as AuthzCacheService,
      { list } as unknown as GuidebookService,
      { findAllProgress } as unknown as GuidebookRepository,
    );

    await expect(service.getDashboard('user-1')).resolves.toEqual({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'USER',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      roadmaps: { items: [{ id: 'roadmap-1' }], nextCursor: null },
      progress: {
        'roadmap-1': [{ topicId: 'topic-1', status: 'done' }],
        'roadmap-2': [{ topicId: 'topic-2', status: 'in-progress' }],
      },
    });
    expect(authzCache.get).toHaveBeenCalledWith('user-1');
    expect(list).toHaveBeenCalledWith(20);
    expect(findAllProgress).toHaveBeenCalledOnce();
  });
});
