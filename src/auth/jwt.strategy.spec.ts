import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../users/users.repository.js';
import type { AuthzCacheService } from './authz-cache.service.js';
import { JwtStrategy } from './jwt.strategy.js';

const profile: UserProfile = {
  id: 'cuser000000000000000001',
  email: 'jane@example.com',
  name: 'Jane Doe',
  role: 'USER',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  sessionsRevokedAt: new Date('2026-01-01T00:00:10.000Z'),
};

function createStrategy(cache: { get: ReturnType<typeof vi.fn> }): JwtStrategy {
  const config = {
    getOrThrow: vi.fn().mockReturnValue('s'.repeat(32)),
  } as unknown as ConfigService;

  return new JwtStrategy(config, cache as unknown as AuthzCacheService);
}

describe('JwtStrategy', () => {
  it('still rejects a token issued at or before sessionsRevokedAt', async () => {
    const cache = { get: vi.fn().mockResolvedValue(profile) };
    const strategy = createStrategy(cache);

    await expect(
      strategy.validate({
        sub: profile.id,
        typ: 'access',
        iat: Math.floor(profile.sessionsRevokedAt!.getTime() / 1000),
      }),
    ).rejects.toThrow('Token revoked');
  });

  it('returns the cached profile for a token issued after revocation', async () => {
    const cache = { get: vi.fn().mockResolvedValue(profile) };
    const strategy = createStrategy(cache);

    await expect(
      strategy.validate({
        sub: profile.id,
        typ: 'access',
        iat: Math.floor(profile.sessionsRevokedAt!.getTime() / 1000) + 1,
      }),
    ).resolves.toEqual({
      userId: profile.id,
      role: profile.role,
      profile,
    });
    expect(cache.get).toHaveBeenCalledWith(profile.id);
  });
});
