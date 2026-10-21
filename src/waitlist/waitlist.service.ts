import { Injectable } from '@nestjs/common';
import { JoinWaitlistDto } from './dto/join-waitlist.dto.js';
import { PaginateWaitlistDto } from './dto/paginate-waitlist.dto.js';
import { WaitlistRepository } from './waitlist.repository.js';

@Injectable()
export class WaitlistService {
  constructor(private readonly waitlistRepository: WaitlistRepository) {}

  async join(dto: JoinWaitlistDto) {
    const email = dto.email.trim().toLowerCase();
    await this.waitlistRepository.upsertIfAbsent(email, dto.source ?? 'waitlist-page');
    return { ok: true };
  }

  getAll(dto: PaginateWaitlistDto) {
    return this.waitlistRepository.findByCursor({
      limit: dto.limit ?? 20,
      cursor: dto.cursor,
    });
  }
}
