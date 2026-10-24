import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async run(): Promise<{ refreshTokens: number; auditLogs: number }> {
    const now = new Date();
    const retentionDays = this.config.get<number>('AUDIT_RETENTION_DAYS') ?? 365;
    const oldAudit = new Date(now.getTime() - retentionDays * 86_400_000);
    const [refresh, audit] = await Promise.all([
      this.prisma.client.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.client.auditLog.deleteMany({ where: { createdAt: { lt: oldAudit } } }),
    ]);
    this.logger.log(`Cleanup deleted ${refresh.count} refresh tokens and ${audit.count} audit logs`);
    return { refreshTokens: refresh.count, auditLogs: audit.count };
  }
}
