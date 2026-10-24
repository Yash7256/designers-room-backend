import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export interface AuditEvent { action: string; userId?: string; ip?: string; userAgent?: string; metadata?: Record<string, unknown>; }

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly prisma: PrismaService) {}
  log(event: AuditEvent): void {
    try {
      void this.prisma.client.auditLog.create({ data: {
        userId: event.userId ?? null, action: event.action, ipAddress: event.ip ?? null,
        userAgent: event.userAgent ?? null, metadata: event.metadata as never,
      } }).catch((error: unknown) => this.logger.error('Audit log write failed', error instanceof Error ? error.stack : String(error)));
    } catch (error) {
      this.logger.error('Audit log write failed', error instanceof Error ? error.stack : String(error));
    }
  }

  async logCritical(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.client.auditLog.create({ data: {
        userId: event.userId ?? null, action: event.action, ipAddress: event.ip ?? null,
        userAgent: event.userAgent ?? null, metadata: event.metadata as never,
      } });
    } catch (error) {
      this.logger.error('Critical audit log write failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
