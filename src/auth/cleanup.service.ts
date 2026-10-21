import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<{ refreshTokens: number; auditLogs: number }> {
    const now = new Date();
    const oldAudit = new Date(now.getTime() - 90 * 86_400_000);
    const [refresh, audit] = await Promise.all([
      this.prisma.client.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.client.auditLog.deleteMany({ where: { createdAt: { lt: oldAudit } } }),
    ]);
    this.logger.log(`Cleanup deleted ${refresh.count} refresh tokens and ${audit.count} audit logs`);
    return { refreshTokens: refresh.count, auditLogs: audit.count };
  }
}
