import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AttemptStatus, ChallengeType, GradeMethod, WeekStatus } from '../../generated/prisma/client.js';
import { QueuesService } from '../queues/queues.service.js';

@Injectable()
export class GradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
  ) {}

  isAutoGradable(type: ChallengeType): boolean {
    return type === ChallengeType.MCQ || type === ChallengeType.ORDERING;
  }

  async gradeAttempt(tx: any, attemptId: string) {
    const attempt = await tx.attempt.findUnique({
      where: { id: attemptId },
      include: { challenge: { include: { week: true, rubric: true } } },
    });
    if (!attempt) return;

    if (this.isAutoGradable(attempt.challenge.type)) {
      await this.autoGrade(tx, attempt);
      return;
    }

    // AI graded types
    await tx.attempt.update({
      where: { id: attemptId },
      data: { status: AttemptStatus.GRADING },
    });
    // Enqueue job (outside tx is fine; worker will pick up)
    // We'll enqueue via service after tx commits - but easier to call after
    await this.queues.enqueueAiGrading(attemptId);
  }

  async autoGrade(tx: any, attempt: any) {
    const challenge = attempt.challenge;
    const answer = attempt.answer || {};
    const answerKey = challenge.answerKey || {};

    let totalScore = 0;
    let scores: any = {};

    if (challenge.type === ChallengeType.MCQ) {
      // Simple check: if answer.selected matches answerKey.correct
      if (answer.selected && answerKey.correct) {
        if (answer.selected === answerKey.correct) {
          totalScore = challenge.maxXp;
          scores = { correct: true };
        } else {
          totalScore = 0;
          scores = { correct: false };
        }
      } else {
        totalScore = 0;
        scores = {};
      }
    } else if (challenge.type === ChallengeType.ORDERING) {
      const expected = answerKey.order || [];
      const given = answer.order || [];
      if (Array.isArray(expected) && Array.isArray(given) && expected.length === given.length) {
        const correct = expected.every((v: any, i: number) => v === given[i]);
        totalScore = correct ? challenge.maxXp : 0;
        scores = { correct };
      } else {
        totalScore = 0;
        scores = { correct: false };
      }
    }

    await tx.grade.create({
      data: {
        attemptId: attempt.id,
        method: GradeMethod.AUTO,
        scores,
        totalScore,
        feedback: totalScore > 0 ? 'Correct' : 'Needs review',
      },
    });

    await tx.attempt.update({
      where: { id: attempt.id },
      data: { status: AttemptStatus.GRADED, gradedAt: new Date() },
    });

    // Award XP if not archived
    if (challenge.week.status !== WeekStatus.ARCHIVED && totalScore > 0) {
      await tx.xpLedger.create({
        data: {
          userId: attempt.userId,
          attemptId: attempt.id,
          weekId: challenge.weekId,
          points: totalScore,
          reason: 'challenge',
        },
      });
      await tx.weeklyScore.upsert({
        where: { userId_weekId: { userId: attempt.userId, weekId: challenge.weekId } },
        create: { userId: attempt.userId, weekId: challenge.weekId, totalXp: totalScore, completedCount: 1 },
        update: { totalXp: { increment: totalScore }, completedCount: { increment: 1 } },
      });
    }
  }
}
