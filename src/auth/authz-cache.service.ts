import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersRepository, type UserProfile } from '../users/users.repository.js';

const DEFAULT_TTL_SECONDS = 30;
const MAX_ENTRIES = 5000;

interface CacheEntry {
  profile: UserProfile;
  expiresAt: number;
}

@Injectable()
export class AuthzCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(
    private readonly usersRepository: UsersRepository,
    config: ConfigService,
  ) {
    this.ttlMs =
      config.get<number>('AUTHZ_CACHE_TTL_SECONDS', DEFAULT_TTL_SECONDS) * 1000;
  }

  async get(userId: string): Promise<UserProfile | null> {
    if (this.ttlMs <= 0) {
      return this.usersRepository.findById(userId);
    }

    const now = Date.now();
    const cached = this.cache.get(userId);
    if (cached) {
      if (cached.expiresAt > now) {
        return cached.profile;
      }
      this.cache.delete(userId);
    }

    const profile = await this.usersRepository.findById(userId);
    if (profile) {
      this.store(userId, profile);
    }
    return profile;
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }

  private store(userId: string, profile: UserProfile): void {
    if (!this.cache.has(userId) && this.cache.size >= MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(userId, {
      profile,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
