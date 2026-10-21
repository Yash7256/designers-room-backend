import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export interface WaitlistEntrySummary {
  id: string;
  email: string;
  source: string | null;
  createdAt: Date;
}

const entrySelect = {
  id: true,
  email: true,
  source: true,
  createdAt: true,
} as const;

@Injectable()
export class WaitlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertIfAbsent(email: string, source: string): Promise<WaitlistEntrySummary> {
    return this.prisma.client.waitlistEntry.upsert({
      where: { email },
      create: { email, source },
      update: {},
      select: entrySelect,
    });
  }

  async findByCursor(options: {
    cursor?: string;
    limit: number;
  }): Promise<{ items: WaitlistEntrySummary[]; nextCursor: string | null }> {
    const take = options.limit + 1; // fetch one extra to determine if there is a next page

    const items = await this.prisma.client.waitlistEntry.findMany({
      take,
      ...(options.cursor
        ? {
            skip: 1,
            cursor: { id: options.cursor },
          }
        : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: entrySelect,
    });

    let nextCursor: string | null = null;
    if (items.length > options.limit) {
      const last = items.pop()!; // remove the extra item
      nextCursor = last.id;
    }

    return { items, nextCursor };
  }
}
