import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProgress(userId: string) {
    const weeklyScores = await this.prisma.client.weeklyScore.findMany({
      where: { userId },
      include: { week: true },
      orderBy: { week: { number: 'asc' } },
    });
    const totalXp = weeklyScores.reduce((sum, s) => sum + s.totalXp, 0);
    const completedCount = weeklyScores.reduce((sum, s) => sum + s.completedCount, 0);
    return { weeklyScores, totalXp, completedCount };
  }

  async getStreak(userId: string) {
    let streak = await this.prisma.client.userStreak.findUnique({ where: { userId } });
    if (!streak) {
      streak = await this.prisma.client.userStreak.create({
        data: { userId, current: 0, longest: 0 },
      });
    }
    return streak;
  }

  async getBadges(userId: string) {
    return this.prisma.client.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    });
  }

  async getWeekSummary(userId: string, weekId: string) {
    const weekly = await this.prisma.client.weeklyScore.findUnique({
      where: { userId_weekId: { userId, weekId } },
      include: { week: true },
    });
    const attempts = await this.prisma.client.attempt.findMany({
      where: { userId, challenge: { weekId } },
      include: { grade: true, challenge: true },
    });
    return {
      week: weekly?.week,
      score: weekly?.totalXp ?? 0,
      completedCount: weekly?.completedCount ?? 0,
      attempts,
    };
  }
}
