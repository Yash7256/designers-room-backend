import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly _client: PrismaClient;

  constructor(private readonly config: ConfigService) {
    const connectionString = this.config.getOrThrow<string>('DATABASE_URL');
    const adapter = new PrismaPg({ connectionString });
    this._client = new PrismaClient({ adapter });
  }

  /** Expose the underlying Prisma client to repositories. */
  get client(): PrismaClient {
    return this._client;
  }

  async onModuleInit(): Promise<void> {
    await this._client.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this._client.$disconnect();
    this.logger.log('Database disconnected');
  }
}
