import { Injectable } from '@nestjs/common';
import { AuthzCacheService } from '../auth/authz-cache.service.js';
import { UsersRepository } from './users.repository.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authzCache: AuthzCacheService,
  ) {}

  getProfile(id: string) {
    return this.usersRepository.findById(id);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const profile = await this.usersRepository.updateProfile(id, dto);
    this.authzCache.invalidate(id);
    return profile;
  }
}
