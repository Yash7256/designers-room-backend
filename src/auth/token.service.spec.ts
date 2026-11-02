import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import type { AuthzCacheService } from './authz-cache.service.js';
import {
  DEVELOPMENT_REFRESH_COOKIE,
  REFRESH_COOKIE,
  TokenService,
  refreshCookieName,
  refreshCookieOptions,
  refreshCookieSameSite,
} from './token.service.js';

describe('refresh cookie', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the __Host- prefixed name in production only', () => {
    expect(refreshCookieName(true)).toBe(REFRESH_COOKIE);
    expect(refreshCookieName(false)).toBe(DEVELOPMENT_REFRESH_COOKIE);
  });

  it('defaults to SameSite=None in production so cross-site SPAs keep the session', () => {
    const options = refreshCookieOptions(true);

    expect(options.sameSite).toBe('none');
    expect(options.secure).toBe(true);
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe('/');
  });

  it('defaults to SameSite=Strict in development', () => {
    const options = refreshCookieOptions(false);

    expect(options.sameSite).toBe('strict');
    expect(options.secure).toBe(false);
  });

  it('honours an explicit COOKIE_SAMESITE', () => {
    vi.stubEnv('COOKIE_SAMESITE', 'lax');

    expect(refreshCookieSameSite(true)).toBe('lax');
    expect(refreshCookieOptions(true).sameSite).toBe('lax');
  });

  it('ignores an invalid COOKIE_SAMESITE', () => {
    vi.stubEnv('COOKIE_SAMESITE', 'bogus');

    expect(refreshCookieSameSite(true)).toBe('none');
    expect(refreshCookieSameSite(false)).toBe('strict');
  });

  it('always marks the cookie secure when SameSite=None', () => {
    vi.stubEnv('COOKIE_SAMESITE', 'none');

    expect(refreshCookieOptions(false).secure).toBe(true);
  });
});

describe('TokenService authz cache invalidation', () => {
  const userId = 'cuser000000000000000001';

  function createService() {
    const client = {
      refreshToken: {
        findUnique: vi.fn().mockResolvedValue({ familyId: 'family', userId }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        update: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(),
    };
    const cache = { invalidate: vi.fn() };
    const config = {
      get: vi.fn().mockReturnValue(0),
    } as unknown as ConfigService;
    const service = new TokenService(
      { client } as unknown as PrismaService,
      config,
      cache as unknown as AuthzCacheService,
    );

    return { cache, client, service };
  }

  it('invalidates after revoke writes sessionsRevokedAt', async () => {
    const { cache, client, service } = createService();

    await service.revoke('raw-token');

    expect(client.user.update).toHaveBeenCalled();
    expect(cache.invalidate).toHaveBeenCalledWith(userId);
  });

  it('invalidates after revokeAll writes sessionsRevokedAt', async () => {
    const { cache, client, service } = createService();

    await service.revokeAll(userId);

    expect(client.user.update).toHaveBeenCalled();
    expect(cache.invalidate).toHaveBeenCalledWith(userId);
  });

  it('invalidates after refresh-token reuse detection', async () => {
    const { cache, client, service } = createService();
    const tx = {
      refreshToken: {
        findUnique: vi.fn().mockResolvedValue({
          usedAt: new Date(Date.now() - 1000),
          revokedAt: null,
          familyId: 'family',
          userId,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    client.$transaction.mockImplementation(
      async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(tx),
    );

    await expect(service.rotate('raw-token')).rejects.toThrow(
      'Refresh token reuse detected',
    );

    expect(client.user.update).toHaveBeenCalled();
    expect(cache.invalidate).toHaveBeenCalledWith(userId);
  });
});
