import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import type { AuthzCacheService } from './authz-cache.service.js';

describe('AuthController refresh', () => {
  it('returns the access token and user profile', async () => {
    const authService = {
      refresh: vi.fn().mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        userId: 'user-1',
      }),
      metadata: vi.fn().mockReturnValue({}),
    };
    const authzCache = {
      get: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'USER',
        createdAt: new Date(),
        sessionsRevokedAt: null,
      }),
    };
    const controller = new AuthController(
      authService as unknown as AuthService,
      authzCache as unknown as AuthzCacheService,
    );
    const response = { cookie: vi.fn() } as unknown as Response;

    await expect(controller.refresh({ headers: {} } as never, response)).resolves.toEqual({
      access_token: 'access-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'USER',
      },
    });
    expect(authzCache.get).toHaveBeenCalledWith('user-1');
  });
});
