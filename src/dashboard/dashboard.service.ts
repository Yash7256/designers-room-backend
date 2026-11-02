import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthzCacheService } from '../auth/authz-cache.service.js';
import { GuidebookRepository } from '../guidebook/guidebook.repository.js';
import { GuidebookService } from '../guidebook/guidebook.service.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly authzCache: AuthzCacheService,
    private readonly guidebookService: GuidebookService,
    private readonly guidebookRepository: GuidebookRepository,
  ) {}

  async getDashboard(userId: string) {
    const [profile, roadmaps, progressRows] = await Promise.all([
      this.authzCache.get(userId),
      this.guidebookService.list(20),
      this.guidebookRepository.findAllProgress(userId),
    ]);
    if (!profile) {
      throw new UnauthorizedException('User no longer exists');
    }

    const progress: Record<string, Array<{ topicId: string; status: string }>> = {};
    for (const row of progressRows) {
      (progress[row.roadmapId] ??= []).push({
        topicId: row.topicId,
        status: row.status,
      });
    }

    return {
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        createdAt: profile.createdAt.toISOString(),
      },
      roadmaps: roadmaps.value,
      progress,
    };
  }
}
