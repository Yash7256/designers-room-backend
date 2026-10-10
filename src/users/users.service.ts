import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  getProfile(id: string) {
    return this.usersRepository.findById(id);
  }

  updateProfile(id: string, dto: UpdateProfileDto) {
    return this.usersRepository.updateProfile(id, dto);
  }
}
