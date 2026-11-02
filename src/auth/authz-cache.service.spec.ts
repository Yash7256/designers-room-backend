import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile, UsersRepository } from '../users/users.repository.js';
import { AuthzCacheService } from './authz-cache.service.js';

const profile: UserProfile = {
  id: 'cuser000000000000000001',
  email: 'jane@example.com',
  name: 'Jane Doe',
  role: 'USER',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  sessionsRevokedAt: null,
};

const mockRepo = {
  findById: vi.fn(),
};

function configWith(ttlSeconds: number): ConfigService {
  return {
    get: vi.fn((key: string, fallback?: unknown) =>
      key === 'AUTHZ_CACHE_TTL_SECONDS' ? ttlSeconds : fallback,
    ),
  } as unknown as ConfigService;
}

function createService(ttlSeconds = 30): AuthzCacheService {
  return new AuthzCacheService(
    mockRepo as unknown as UsersRepository,
    configWith(ttlSeconds),
  );
}

describe('AuthzCacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a profile on a cache miss', async () => {
    mockRepo.findById.mockResolvedValue(profile);
    const service = createService();

    await expect(service.get(profile.id)).resolves.toEqual(profile);

    expect(mockRepo.findById).toHaveBeenCalledOnce();
    expect(mockRepo.findById).toHaveBeenCalledWith(profile.id);
  });

  it('serves a cache hit without calling the repository', async () => {
    mockRepo.findById.mockResolvedValue(profile);
    const service = createService();

    await service.get(profile.id);
    await expect(service.get(profile.id)).resolves.toEqual(profile);

    expect(mockRepo.findById).toHaveBeenCalledTimes(1);
  });

  it('forces a repository load after invalidation', async () => {
    mockRepo.findById.mockResolvedValue(profile);
    const service = createService();

    await service.get(profile.id);
    service.invalidate(profile.id);
    await service.get(profile.id);

    expect(mockRepo.findById).toHaveBeenCalledTimes(2);
  });

  it('disables caching when the TTL is zero', async () => {
    mockRepo.findById.mockResolvedValue(profile);
    const service = createService(0);

    await service.get(profile.id);
    await service.get(profile.id);

    expect(mockRepo.findById).toHaveBeenCalledTimes(2);
  });

  it('does not cache a missing user', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const service = createService();

    await service.get(profile.id);
    await service.get(profile.id);

    expect(mockRepo.findById).toHaveBeenCalledTimes(2);
  });
});
