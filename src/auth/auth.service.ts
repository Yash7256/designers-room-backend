import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service.js';
import { AuditService } from './audit.service.js';
import type { GoogleIdentity } from './google.strategy.js';
import { TokenService } from './token.service.js';

type RequestMeta = { userAgent?: string; ipAddress?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async loginWithGoogle(identity: GoogleIdentity, meta?: RequestMeta) {
    if (identity.emailVerified !== true) {
      this.audit.log({ action: 'LOGIN_REJECTED', ip: meta?.ipAddress, userAgent: meta?.userAgent, metadata: { provider: 'google', reason: 'email_not_verified' } });
      throw new UnauthorizedException('Google email is not verified');
    }

    const email = identity.email.toLowerCase().trim();
    const existingByGoogleId = await this.prisma.client.user.findUnique({ where: { googleId: identity.googleId } });
    if (existingByGoogleId) {
      this.audit.log({ action: 'LOGIN', userId: existingByGoogleId.id, ip: meta?.ipAddress, userAgent: meta?.userAgent, metadata: { provider: 'google' } });
      return this.issueTokens(existingByGoogleId.id, meta);
    }

    const existingByEmail = await this.prisma.client.user.findUnique({ where: { email } });
    if (!existingByEmail) {
      const user = await this.prisma.client.user.create({ data: { email, googleId: identity.googleId, name: identity.name } });
      this.audit.log({ action: 'LOGIN', userId: user.id, ip: meta?.ipAddress, userAgent: meta?.userAgent, metadata: { provider: 'google' } });
      return this.issueTokens(user.id, meta);
    }

    if (existingByEmail.googleId == null) {
      const user = await this.prisma.client.user.update({ where: { id: existingByEmail.id }, data: { googleId: identity.googleId } });
      this.audit.log({ action: 'LOGIN', userId: user.id, ip: meta?.ipAddress, userAgent: meta?.userAgent, metadata: { provider: 'google' } });
      return this.issueTokens(user.id, meta);
    }

    if (existingByEmail.googleId !== identity.googleId) {
      this.audit.log({ action: 'LOGIN_REJECTED', ip: meta?.ipAddress, userAgent: meta?.userAgent, metadata: { provider: 'google', reason: 'google_id_mismatch', userId: existingByEmail.id } });
      throw new UnauthorizedException('Account already linked to a different Google account');
    }

    this.audit.log({ action: 'LOGIN', userId: existingByEmail.id, ip: meta?.ipAddress, userAgent: meta?.userAgent, metadata: { provider: 'google' } });
    return this.issueTokens(existingByEmail.id, meta);
  }

  async refresh(raw: string | undefined, meta?: RequestMeta) {
    if (!raw) throw new UnauthorizedException('Invalid refresh token');
    try {
      const rotated = await this.tokens.rotate(raw, meta);
      this.audit.log({ action: 'TOKEN_REFRESH', userId: rotated.userId, ip: meta?.ipAddress, userAgent: meta?.userAgent });
      return { access_token: this.jwtService.sign({ sub: rotated.userId }), refresh_token: rotated.raw };
    } catch (error) {
      if (error instanceof UnauthorizedException && error.message === 'Refresh token reuse detected') this.audit.log({ action: 'TOKEN_REUSE_DETECTED', ip: meta?.ipAddress, userAgent: meta?.userAgent });
      throw error;
    }
  }

  async logout(raw?: string) { await this.tokens.revoke(raw); return { success: true }; }
  auditLogout(userId?: string) { this.audit.log({ action: 'LOGOUT', userId }); }
  async logoutAll(userId: string) { await this.tokens.revokeAll(userId); this.audit.log({ action: 'LOGOUT_ALL', userId }); return { success: true }; }
  metadata(req: import('express').Request): RequestMeta { return this.tokens.metadata(req); }

  private async issueTokens(userId: string, meta?: RequestMeta) {
    const { raw } = await this.tokens.issueRefreshToken(userId, undefined, undefined, meta);
    return { access_token: this.jwtService.sign({ sub: userId }), refresh_token: raw };
  }
}
