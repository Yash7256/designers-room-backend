import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../database/prisma.service.js';
import { AuthService } from './auth.service.js';
import type { AuditService } from './audit.service.js';
import type { TokenService } from './token.service.js';

describe('AuthService audit timing', () => {
  it('awaits critical login rejection audit events', async () => {
    let releaseCritical!: () => void;
    const critical = new Promise<void>((resolve) => {
      releaseCritical = resolve;
    });
    const audit = {
      logCritical: vi.fn().mockReturnValue(critical),
      logDeferred: vi.fn(),
    };
    const service = new AuthService(
      {} as JwtService,
      {} as TokenService,
      {} as PrismaService,
      audit as unknown as AuditService,
    );

    const result = service.loginWithGoogle({
      email: 'user@example.com',
      googleId: 'google-id',
      name: 'User',
      emailVerified: false,
    });

    await vi.waitFor(() => expect(audit.logCritical).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_REJECTED' }),
    ));
    let settled = false;
    void result.then(
      () => { settled = true; },
      () => { settled = true; },
    );
    await Promise.resolve();
    expect(settled).toBe(false);

    releaseCritical();
    await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
    expect(audit.logDeferred).not.toHaveBeenCalled();
  });
});
