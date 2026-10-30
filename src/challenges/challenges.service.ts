import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CalendarService } from '../calendar/calendar.service.js';
import { WeekStatus } from '../../generated/prisma/client.js';

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
  ) {}

  async listByWeek(weekId: string, userId?: string) {
    const week = await this.prisma.client.week.findUnique({ where: { id: weekId } });
    if (!week) throw new NotFoundException('Week not found');
    const now = new Date();
    const isArchived = week.status === WeekStatus.ARCHIVED;

    const challenges = await this.prisma.client.challenge.findMany({
      where: { weekId },
      orderBy: { dayNumber: 'asc' },
    });

    let attempts: any[] = [];
    if (userId) {
      attempts = await this.prisma.client.attempt.findMany({
        where: { userId, challengeId: { in: challenges.map((c) => c.id) } },
      });
    }
    const attemptMap = new Map(attempts.map((a) => [a.challengeId, a]));

    return challenges.map((c) => {
      const unlocked = isArchived ? true : this.calendar.isUnlocked(week, c.dayNumber, now);
      if (!unlocked) {
        return {
          id: c.id,
          weekId: c.weekId,
          dayNumber: c.dayNumber,
          type: c.type,
          title: c.title,
          status: c.status,
          locked: true,
        };
      }
      const attempt = attemptMap.get(c.id);
      return {
        id: c.id,
        weekId: c.weekId,
        dayNumber: c.dayNumber,
        type: c.type,
        title: c.title,
        brief: c.brief,
        imageUrls: c.imageUrls,
        payload: c.payload,
        maxXp: c.maxXp,
        difficulty: c.difficulty,
        status: c.status,
        version: c.version,
        locked: false,
        userStatus: attempt?.status ?? null,
        attemptId: attempt?.id ?? null,
      };
    });
  }

  async getChallenge(id: string) {
    const c = await this.prisma.client.challenge.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Challenge not found');
    // Never expose answerKey
    const { answerKey, ...rest } = c as any;
    return rest;
  }
}
