import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoadmapsRepository } from './roadmaps.repository.js';
import { RoadmapsService } from './roadmaps.service.js';

const mockRepo = {
  findAll: vi.fn(),
  findById: vi.fn(),
};

const sampleRoadmap = {
  id: 'croadmap00000000000001',
  title: 'Test Roadmap',
  description: null,
  createdAt: new Date(),
  userId: 'cuser000000000000000001',
  topics: [],
};

describe('RoadmapsService', () => {
  let service: RoadmapsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RoadmapsService(mockRepo as unknown as RoadmapsRepository);
  });

  describe('getAll', () => {
    it('returns paginated result from repository', async () => {
      mockRepo.findAll.mockResolvedValue({
        items: [sampleRoadmap],
        nextCursor: null,
      });

      const result = await service.getAll({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
      expect(mockRepo.findAll).toHaveBeenCalledWith(20, undefined);
    });
  });

  describe('getById', () => {
    it('returns the roadmap if found', async () => {
      mockRepo.findById.mockResolvedValue(sampleRoadmap);

      const result = await service.getById(sampleRoadmap.id);

      expect(result).toEqual(sampleRoadmap);
    });

    it('throws NotFoundException when roadmap does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getById('c000000000000000000000001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
