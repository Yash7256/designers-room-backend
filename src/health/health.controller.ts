import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  /** Liveness — always returns 200 if the process is up. */
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  /** Readiness — checks database connectivity. */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () =>
        this.prismaHealth.pingCheck('database', this.prisma.client as never),
    ]);
  }
}
