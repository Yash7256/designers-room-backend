import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WaitlistRepository } from './waitlist.repository.js';
import { WaitlistService } from './waitlist.service.js';

const mockRepo = {
  upsertIfAbsent: vi.fn(),
  findByCursor: vi.fn(),
};

const sampleEntry = {
  id: 'cwaitlist00000000000001',
  email: 'foo@example.com',
  source: 'waitlist-page',
  createdAt: new Date(),
};

describe('WaitlistService', () => {
  let service: WaitlistService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WaitlistService(mockRepo as unknown as WaitlistRepository);
  });

  describe('join', () => {
    it('normalizes the email (trim + lowercase) before delegating', async () => {
      mockRepo.upsertIfAbsent.mockResolvedValue(sampleEntry);

      const result = await service.join({
        email: '  Foo@Example.COM ',
        source: 'waitlist-page',
      });

      expect(result).toEqual({ ok: true });
      expect(mockRepo.upsertIfAbsent).toHaveBeenCalledWith(
        'foo@example.com',
        'waitlist-page',
      );
    });

    it('defaults source to waitlist-page when omitted', async () => {
      mockRepo.upsertIfAbsent.mockResolvedValue(sampleEntry);

      await service.join({ email: 'foo@example.com' });

      expect(mockRepo.upsertIfAbsent).toHaveBeenCalledWith(
        'foo@example.com',
        'waitlist-page',
      );
    });

    it('returns { ok: true } on first join', async () => {
      mockRepo.upsertIfAbsent.mockResolvedValue({
        ...sampleEntry,
        email: 'new@example.com',
      });

      const result = await service.join({ email: 'new@example.com' });

      expect(result).toEqual({ ok: true });
      expect(mockRepo.upsertIfAbsent).toHaveBeenCalledTimes(1);
    });

    it('returns { ok: true } when the email already existed (idempotent path)', async () => {
      // upsert returns the pre-existing row without changing it
      mockRepo.upsertIfAbsent.mockResolvedValue(sampleEntry);

      const first = await service.join({ email: 'foo@example.com' });
      const second = await service.join({ email: 'FOO@EXAMPLE.COM' });

      expect(first).toEqual({ ok: true });
      expect(second).toEqual({ ok: true });
    });
  });

  describe('getAll', () => {
    it('returns paginated result from repository', async () => {
      mockRepo.findByCursor.mockResolvedValue({
        items: [sampleEntry],
        nextCursor: null,
      });

      const result = await service.getAll({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
      expect(mockRepo.findByCursor).toHaveBeenCalledWith({
        limit: 20,
        cursor: undefined,
      });
    });
  });
});
