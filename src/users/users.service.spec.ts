import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

const mockRepo = {
  findById: vi.fn(),
  updateProfile: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
};

const sampleUser = {
  id: 'cuser000000000000000001',
  email: 'jane@example.com',
  name: 'Jane Doe',
  createdAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(mockRepo as unknown as UsersRepository);
  });

  describe('getProfile', () => {
    it('returns the user profile', async () => {
      mockRepo.findById.mockResolvedValue(sampleUser);

      const result = await service.getProfile(sampleUser.id);

      expect(result).toEqual(sampleUser);
      expect(mockRepo.findById).toHaveBeenCalledWith(sampleUser.id);
    });
  });

  describe('updateProfile', () => {
    it('updates and returns the updated profile', async () => {
      const updated = { ...sampleUser, name: 'Jane Updated' };
      mockRepo.updateProfile.mockResolvedValue(updated);

      const result = await service.updateProfile(sampleUser.id, {
        name: 'Jane Updated',
      });

      expect(result?.name).toBe('Jane Updated');
      expect(mockRepo.updateProfile).toHaveBeenCalledWith(sampleUser.id, {
        name: 'Jane Updated',
      });
    });
  });
});
