import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';

const DAY = 86_400_000;
export const REFRESH_COOKIE = '__Host-refresh';
export const DEVELOPMENT_REFRESH_COOKIE = 'refresh';

export type RefreshCookieSameSite = 'strict' | 'lax' | 'none';

export function refreshCookieName(isProd: boolean): string {
  return isProd ? REFRESH_COOKIE : DEVELOPMENT_REFRESH_COOKIE;
}

// The SPA and the API usually live on different sites (e.g. *.vercel.app hosts
// are separate sites because vercel.app is a public suffix), so the browser
// treats the frontend's API calls as cross-site and drops SameSite=Strict
// cookies. In production the refresh cookie therefore has to be
// SameSite=None; Secure. COOKIE_SAMESITE overrides it when the API is served
// from the same site as the SPA.
export function refreshCookieSameSite(isProd: boolean): RefreshCookieSameSite {
  const configured = process.env['COOKIE_SAMESITE'];
  if (configured === 'strict' || configured === 'lax' || configured === 'none') return configured;
  return isProd ? 'none' : 'strict';
}

export function refreshCookieOptions(isProd: boolean) {
  const sameSite = refreshCookieSameSite(isProd);
  return {
    httpOnly: true as const,
    secure: isProd || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge: 30 * DAY,
  };
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private getGraceSeconds(): number {
    const value = this.config.get<number>('REFRESH_GRACE_SECONDS');
    return typeof value === 'number' && value >= 0 ? value : 10;
  }

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
        const graceSeconds = this.getGraceSeconds();
        if (token.usedAt && graceSeconds > 0 && now.getTime() - token.usedAt.getTime() <= graceSeconds * 1000) {
          return { reuse: 'grace' as const };
        }
        await tx.refreshToken.updateMany({ where: { familyId: token.familyId, usedAt: null }, data: { usedAt: now } });
        return { reuse: true as const, familyId: token.familyId, userId: token.userId };
      }
      if (token.expiresAt <= now) throw new UnauthorizedException('Refresh token expired');
      if (token.absoluteExpiry <= now) throw new UnauthorizedException('Session expired, please log in again');
      const consumed = await tx.refreshToken.updateMany({ where: { id: token.id, usedAt: null, revokedAt: null }, data: { usedAt: now, lastUsedAt: now } });
      if (consumed.count !== 1) {
        const graceSeconds = this.getGraceSeconds();
        if (graceSeconds > 0) {
          return { reuse: 'grace' as const };
        }
        await tx.refreshToken.updateMany({ where: { familyId: token.familyId, usedAt: null }, data: { usedAt: now } });
        return { reuse: true as const, familyId: token.familyId, userId: token.userId };
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
    if (outcome.reuse === 'grace') throw new UnauthorizedException('Invalid refresh token');
    if (outcome.reuse === true) throw new UnauthorizedException('Refresh token reuse detected');
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
