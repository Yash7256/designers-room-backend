import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CalendarService } from '../calendar/calendar.service.js';
import { AttemptStatus, ChallengeStatus, WeekStatus } from '../../generated/prisma/client.js';
import { GradingService } from '../grading/grading.service.js';

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
    private readonly grading: GradingService,
  ) {}

  async start(userId: string, challengeId: string) {
    const challenge = await this.prisma.client.challenge.findUnique({
      where: { id: challengeId },
      include: { week: true },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.status !== ChallengeStatus.PUBLISHED) {
      throw new ForbiddenException('Challenge not published');
    }
    const now = new Date();
    if (challenge.week.status === WeekStatus.ARCHIVED) {
      // allow in practice mode
    } else if (challenge.week.status !== WeekStatus.LIVE && challenge.week.status !== WeekStatus.SCHEDULED) {
      throw new ForbiddenException('Week not active');
    } else if (!this.calendar.isUnlocked(challenge.week, challenge.dayNumber, now)) {
      throw new ForbiddenException('Challenge locked');
    }

    const existing = await this.prisma.client.attempt.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });
    if (existing) {
      if (existing.status === AttemptStatus.GRADED || existing.status === AttemptStatus.SUBMITTED || existing.status === AttemptStatus.GRADING) {
        return existing;
      }
      return existing;
    }
    return this.prisma.client.attempt.create({
      data: {
        userId,
        challengeId,
        challengeVersion: challenge.version,
        status: AttemptStatus.IN_PROGRESS,
      },
    });
  }

  async saveAnswer(userId: string, attemptId: string, answer: any) {
    const attempt = await this.prisma.client.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot edit submitted attempt');
    }
    return this.prisma.client.attempt.update({
      where: { id: attemptId },
      data: { answer },
    });
  }

  async submit(userId: string, attemptId: string) {
    return this.prisma.client.$transaction(async (tx) => {
      const attempt = await tx.attempt.findUnique({
        where: { id: attemptId },
        include: { challenge: { include: { week: true, rubric: true } } },
      });
      if (!attempt) throw new NotFoundException('Attempt not found');
      if (attempt.userId !== userId) throw new ForbiddenException();
      if (attempt.status === AttemptStatus.SUBMITTED || attempt.status === AttemptStatus.GRADING || attempt.status === AttemptStatus.GRADED) {
        return attempt;
      }
      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new BadRequestException('Invalid attempt state');
      }

      const now = new Date();
      if (attempt.challenge.week.status === WeekStatus.ARCHIVED) {
        // practice mode - still allow submitting? per spec "Attempts allowed, XP not awarded" - but grading still happens
      } else if (!this.calendar.isUnlocked(attempt.challenge.week, attempt.challenge.dayNumber, now)) {
        throw new ForbiddenException('Challenge locked');
      }

      // Mark as submitted
      const updated = await tx.attempt.update({
        where: { id: attemptId },
        data: { status: AttemptStatus.SUBMITTED, submittedAt: now },
      });

      // Grade based on type
      await this.grading.gradeAttempt(tx, updated.id);

      return tx.attempt.findUnique({ where: { id: updated.id }, include: { grade: true } });
    });
  }

  async getAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.client.attempt.findUnique({
      where: { id: attemptId },
      include: { grade: true, challenge: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException();
    // Don't expose answerKey
    if ((attempt as any).challenge?.answerKey) {
      delete (attempt as any).challenge.answerKey;
    }
    return attempt;
  }
}
