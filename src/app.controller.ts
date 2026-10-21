import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator.js';

@ApiTags('meta')
@Controller()
export class AppController {
  /** Service descriptor — lets the deployment URL be opened directly. */
  @Get()
  @Public()
  root() {
    return {
      service: "Designer's Room API",
      status: 'ok',
      health: '/health',
      ready: '/health/ready',
      docs: '/api/docs',
    };
  }
}
