import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { AttemptsService } from './attempts.service.js';
import { SaveAnswerDto } from './dto/save-answer.dto.js';

@Controller()
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post('challenges/:id/start')
  async start(@Req() req: any, @Param('id') challengeId: string) {
    const userId = req.user.id;
    return this.attempts.start(userId, challengeId);
  }

  @Put('attempts/:id/answer')
  async saveAnswer(@Req() req: any, @Param('id') attemptId: string, @Body() dto: SaveAnswerDto) {
    const userId = req.user.id;
    return this.attempts.saveAnswer(userId, attemptId, dto.answer);
  }

  @Post('attempts/:id/submit')
  async submit(@Req() req: any, @Param('id') attemptId: string) {
    const userId = req.user.id;
    return this.attempts.submit(userId, attemptId);
  }

  @Get('attempts/:id')
  async get(@Req() req: any, @Param('id') attemptId: string) {
    const userId = req.user.id;
    return this.attempts.getAttempt(userId, attemptId);
  }
}
