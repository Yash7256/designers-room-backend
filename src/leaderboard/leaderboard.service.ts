import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async weekly(weekId: string, topN = 50) {
    const scores = await this.prisma.client.weeklyScore.findMany({
      where: { weekId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ totalXp: 'desc' }, { updatedAt: 'asc' }],
      take: topN,
    });
    return scores.map((s, idx) => ({
      rank: idx + 1,
      userId: s.userId,
      name: s.user.name,
      totalXp: s.totalXp,
      completedCount: s.completedCount,
    }));
  }

  async allTime(topN = 50) {
    const result = await this.prisma.client.weeklyScore.groupBy({
      by: ['userId'],
      _sum: { totalXp: true, completedCount: true },
      orderBy: { _sum: { totalXp: 'desc' } },
      take: topN,
    });
    const userIds = result.map((r) => r.userId);
    const users = await this.prisma.client.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return result.map((r, idx) => ({
      rank: idx + 1,
      userId: r.userId,
      name: userMap.get(r.userId)?.name,
      totalXp: r._sum.totalXp || 0,
      completedCount: r._sum.completedCount || 0,
    }));
  }
}
