import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { runInBackground } from '../common/background.js';

export interface AuditEvent { action: string; userId?: string; ip?: string; userAgent?: string; metadata?: Record<string, unknown>; }

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly prisma: PrismaService) {}

  private async write(event: AuditEvent): Promise<void> {
    await this.prisma.client.auditLog.create({ data: {
      userId: event.userId ?? null, action: event.action, ipAddress: event.ip ?? null,
      userAgent: event.userAgent ?? null, metadata: event.metadata as never,
    } });
  }

  logDeferred(event: AuditEvent): Promise<void> {
    return runInBackground(this.write(event));
  }

  log(event: AuditEvent): void {
    try {
      void this.write(event).catch((error: unknown) => this.logger.error('Audit log write failed', error instanceof Error ? error.stack : String(error)));
    } catch (error) {
      this.logger.error('Audit log write failed', error instanceof Error ? error.stack : String(error));
    }
  }

  async logCritical(event: AuditEvent): Promise<void> {
    try {
      await this.write(event);
    } catch (error) {
      this.logger.error('Critical audit log write failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
