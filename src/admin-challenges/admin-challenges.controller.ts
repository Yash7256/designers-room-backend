import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/client.js';
import { AdminChallengesService } from './admin-challenges.service.js';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminChallengesController {
  constructor(private readonly admin: AdminChallengesService) {}

  @Post('weeks')
  createWeek(@Body() data: any) {
    return this.admin.createWeek(data);
  }
  @Put('weeks/:id')
  updateWeek(@Param('id') id: string, @Body() data: any) {
    return this.admin.updateWeek(id, data);
  }
  @Delete('weeks/:id')
  deleteWeek(@Param('id') id: string) {
    return this.admin.deleteWeek(id);
  }
  @Post('weeks/:id/publish')
  publish(@Param('id') id: string) {
    return this.admin.publishWeek(id);
  }

  @Post('challenges')
  createChallenge(@Body() data: any) {
    return this.admin.createChallenge(data);
  }
  @Put('challenges/:id')
  updateChallenge(@Param('id') id: string, @Body() data: any) {
    return this.admin.updateChallenge(id, data);
  }
  @Delete('challenges/:id')
  deleteChallenge(@Param('id') id: string) {
    return this.admin.deleteChallenge(id);
  }

  @Post('rubrics')
  createRubric(@Body() data: any) {
    return this.admin.createRubric(data);
  }
  @Put('rubrics/:id')
  updateRubric(@Param('id') id: string, @Body() data: any) {
    return this.admin.updateRubric(id, data);
  }
  @Delete('rubrics/:id')
  deleteRubric(@Param('id') id: string) {
    return this.admin.deleteRubric(id);
  }

  @Post('import')
  import(@Body() body: any) {
    return this.admin.importBulk(body.challenges || []);
  }

  @Post('attempts/:id/regrade')
  regrade(@Param('id') id: string) {
    return this.admin.regradeAttempt(id);
  }
}
