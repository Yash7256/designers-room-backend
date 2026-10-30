import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { WeekStatus } from '../../generated/prisma/client.js';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentWeek() {
    const now = new Date();
    // Find week where now is between startsAt and endsAt and status LIVE, else latest SCHEDULED/LIVE
    const live = await this.prisma.client.week.findFirst({
      where: {
        status: WeekStatus.LIVE,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: { number: 'asc' },
    });
    if (live) return live;

    const scheduled = await this.prisma.client.week.findFirst({
      where: { status: { in: [WeekStatus.SCHEDULED, WeekStatus.LIVE] } },
      orderBy: { startsAt: 'asc' },
    });
    return scheduled;
  }

  async listWeeks() {
    return this.prisma.client.week.findMany({
      orderBy: { number: 'asc' },
    });
  }

  async getWeekById(id: string) {
    return this.prisma.client.week.findUnique({
      where: { id },
    });
  }

  isUnlocked(week: { startsAt: Date }, dayNumber: number, now: Date = new Date()): boolean {
    // unlock time = week.startsAt + (dayNumber-1) days (server time)
    const unlockAt = new Date(week.startsAt.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000);
    return now >= unlockAt;
  }
}
