import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';

const DAY = 86_400_000;
export const REFRESH_COOKIE = '__Host-refresh';
export const DEVELOPMENT_REFRESH_COOKIE = 'refresh';

export function refreshCookieName(isProd: boolean): string {
  return isProd ? REFRESH_COOKIE : DEVELOPMENT_REFRESH_COOKIE;
}

export function refreshCookieOptions(isProd: boolean) {
  return { httpOnly: true as const, secure: isProd, sameSite: 'strict' as const, path: '/', maxAge: 30 * DAY };
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issueRefreshToken(userId: string, familyId = randomUUID(), absoluteExpiry = new Date(Date.now() + 90 * DAY), meta?: { userAgent?: string; ipAddress?: string }) {
    const raw = randomBytes(48).toString('base64url');
    const createdAt = new Date();
    const record = await this.prisma.client.refreshToken.create({ data: {
      userId, familyId, familyCreatedAt: createdAt, absoluteExpiry,
      tokenHash: sha256(raw), createdAt, expiresAt: new Date(createdAt.getTime() + 30 * DAY),
      userAgent: meta?.userAgent, ipAddress: meta?.ipAddress,
    } });
    return { raw, record };
  }

  async rotate(raw: string, meta?: { userAgent?: string; ipAddress?: string }) {
    const hash = sha256(raw);
    const outcome = await this.prisma.client.$transaction(async (tx) => {
      const token = await tx.refreshToken.findUnique({ where: { tokenHash: hash } });
      if (!token) throw new UnauthorizedException('Invalid refresh token');
      const now = new Date();
      if (token.usedAt || token.revokedAt) {
      await tx.refreshToken.updateMany({ where: { familyId: token.familyId, usedAt: null }, data: { usedAt: now } });
        return { reuse: true as const };
      }
      if (token.expiresAt <= now) throw new UnauthorizedException('Refresh token expired');
      if (token.absoluteExpiry <= now) throw new UnauthorizedException('Session expired, please log in again');
      const consumed = await tx.refreshToken.updateMany({ where: { id: token.id, usedAt: null, revokedAt: null }, data: { usedAt: now, lastUsedAt: now } });
      if (consumed.count !== 1) {
        await tx.refreshToken.updateMany({ where: { familyId: token.familyId, usedAt: null }, data: { usedAt: now } });
        return { reuse: true as const };
      }
      const nextRaw = randomBytes(48).toString('base64url');
      const createdAt = now;
      const next = await tx.refreshToken.create({ data: {
        userId: token.userId, familyId: token.familyId, familyCreatedAt: token.familyCreatedAt,
        absoluteExpiry: token.absoluteExpiry, tokenHash: sha256(nextRaw), createdAt,
        expiresAt: new Date(createdAt.getTime() + 30 * DAY), userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      } });
      await tx.refreshToken.update({ where: { id: token.id }, data: { replacedBy: next.id } });
      return { reuse: false as const, userId: token.userId, raw: nextRaw, token: next };
    });
    if (outcome.reuse) throw new UnauthorizedException('Refresh token reuse detected');
    return outcome;
  }

  async revoke(raw?: string): Promise<void> {
    if (raw) await this.prisma.client.refreshToken.updateMany({ where: { tokenHash: sha256(raw), usedAt: null }, data: { usedAt: new Date() } });
  }

  async revokeAll(userId: string, exceptRaw?: string): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({ where: { userId, usedAt: null, ...(exceptRaw ? { tokenHash: { not: sha256(exceptRaw) } } : {}) }, data: { usedAt: new Date() } });
  }

  metadata(req: Request) {
    return { userAgent: req.get('user-agent') ?? undefined, ipAddress: req.ip };
  }
}
