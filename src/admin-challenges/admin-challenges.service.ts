import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class AdminChallengesService {
  constructor(private readonly prisma: PrismaService) {}

  // Weeks
  createWeek(data: any) {
    return this.prisma.client.week.create({ data });
  }
  updateWeek(id: string, data: any) {
    return this.prisma.client.week.update({ where: { id }, data });
  }
  deleteWeek(id: string) {
    return this.prisma.client.week.delete({ where: { id } });
  }
  publishWeek(id: string) {
    return this.prisma.client.week.update({ where: { id }, data: { status: 'LIVE' as any } });
  }

  // Challenges
  createChallenge(data: any) {
    return this.prisma.client.challenge.create({ data });
  }
  updateChallenge(id: string, data: any) {
    return this.prisma.client.challenge.update({ where: { id }, data });
  }
  deleteChallenge(id: string) {
    return this.prisma.client.challenge.delete({ where: { id } });
  }

  // Rubrics
  createRubric(data: any) {
    return this.prisma.client.rubric.create({ data });
  }
  updateRubric(id: string, data: any) {
    return this.prisma.client.rubric.update({ where: { id }, data });
  }
  deleteRubric(id: string) {
    return this.prisma.client.rubric.delete({ where: { id } });
  }

  async importBulk(challenges: any[]) {
    const results = [];
    for (const c of challenges) {
      const res = await this.prisma.client.challenge.upsert({
        where: { weekId_dayNumber: { weekId: c.weekId, dayNumber: c.dayNumber } },
        create: c,
        update: c,
      });
      results.push(res);
    }
    return { imported: results.length };
  }

  async regradeAttempt(attemptId: string) {
    const attempt = await this.prisma.client.attempt.findUnique({ where: { id: attemptId }, include: { challenge: { include: { week: true } } } });
    if (!attempt) throw new Error('Attempt not found');
    // reset and regrade - simplified
    await this.prisma.client.grade.deleteMany({ where: { attemptId } });
    await this.prisma.client.attempt.update({ where: { id: attemptId }, data: { status: 'SUBMITTED' as any } });
    // trigger grading
    return { regraded: true };
  }
}
