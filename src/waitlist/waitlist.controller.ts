import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JoinWaitlistDto } from './dto/join-waitlist.dto.js';
import { PaginateWaitlistDto } from './dto/paginate-waitlist.dto.js';
import { WaitlistService } from './waitlist.service.js';

@ApiTags('waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiCreatedResponse({
    description: 'Email accepted (or already on the list)',
    schema: { example: { ok: true } },
  })
  @ApiBadRequestResponse({ description: 'Invalid email' })
  @Post()
  join(@Body() dto: JoinWaitlistDto) {
    return this.waitlistService.join(dto);
  }
}

@ApiTags('waitlist')
@Controller('admin/waitlist')
@Roles('ADMIN')
export class WaitlistAdminController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Caller is not an admin' })
  @Get()
  getAll(@Query() dto: PaginateWaitlistDto) {
    return this.waitlistService.getAll(dto);
  }
}
