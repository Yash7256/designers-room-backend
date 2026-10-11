import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersRepository } from '../users/users.repository.js';
import { AuthService } from './auth.service.js';

const mockUsersRepo = {
  findByEmail: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  updateProfile: vi.fn(),
};

const mockJwtService = {
  sign: vi.fn().mockReturnValue('mock.jwt.token'),
};

const mockConfigService = {
  get: vi.fn().mockReturnValue('15m'),
  getOrThrow: vi.fn().mockReturnValue('15m'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      mockUsersRepo as unknown as UsersRepository,
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('signup', () => {
    it('creates a user and returns an access token', async () => {
      mockUsersRepo.create.mockResolvedValue({
        id: 'user1',
        email: 'jane@example.com',
        name: 'Jane',
        createdAt: new Date(),
      });

      const result = await service.signup({
        email: 'jane@example.com',
        password: 'securepass',
        name: 'Jane',
      });

      expect(result).toEqual({ access_token: 'mock.jwt.token' });
      expect(mockUsersRepo.create).toHaveBeenCalledOnce();
    });

    it('throws ConflictException on duplicate email (P2002)', async () => {
      mockUsersRepo.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.signup({
          email: 'jane@example.com',
          password: 'securepass',
          name: 'Jane',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns access token for valid credentials', async () => {
      // We need a real bcrypt hash for the test to pass
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('securepass', 10);

      mockUsersRepo.findByEmail.mockResolvedValue({
        id: 'user1',
        email: 'jane@example.com',
        name: 'Jane',
        password: hash,
        createdAt: new Date(),
      });

      const result = await service.login({
        email: 'jane@example.com',
        password: 'securepass',
      });

      expect(result).toEqual({ access_token: 'mock.jwt.token' });
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('rightpass', 10);

      mockUsersRepo.findByEmail.mockResolvedValue({
        id: 'user1',
        email: 'jane@example.com',
        name: 'Jane',
        password: hash,
        createdAt: new Date(),
      });

      await expect(
        service.login({ email: 'jane@example.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found (timing-safe)', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
