import { Injectable } from '@nestjs/common';

@Injectable()
export class QueuesService {
  // Placeholder for BullMQ - in production would use Queue
  private jobs: any[] = [];

  async enqueueAiGrading(attemptId: string) {
    this.jobs.push({ type: 'ai-grading', attemptId, enqueuedAt: new Date() });
    return { enqueued: true, attemptId };
  }

  getJobs() {
    return this.jobs;
  }
}
