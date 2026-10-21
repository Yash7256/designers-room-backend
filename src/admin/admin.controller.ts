import { Body, Controller, Delete, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('admin')
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}
  @Post('roadmaps') createRoadmap(@Body() body: { title: string; description?: string }, @Req() req: Request & { user: { userId: string } }) {
    return this.prisma.client.roadmap.create({ data: { title: body.title, description: body.description, userId: req.user.userId } });
  }
  @Patch('roadmaps/:id') updateRoadmap(@Param('id') id: string, @Body() body: { title?: string; description?: string }) {
    return this.prisma.client.roadmap.update({ where: { id }, data: body });
  }
  @Delete('roadmaps/:id') deleteRoadmap(@Param('id') id: string) { return this.prisma.client.roadmap.delete({ where: { id } }); }
  @Post('roadmaps/:roadmapId/topics') createTopic(@Param('roadmapId') roadmapId: string, @Body() body: { title: string; description?: string; position?: number }) {
    return this.prisma.client.topic.create({ data: { ...body, roadmapId } });
  }
  @Patch('topics/:id') updateTopic(@Param('id') id: string, @Body() body: { title?: string; description?: string; position?: number }) {
    return this.prisma.client.topic.update({ where: { id }, data: body });
  }
  @Delete('topics/:id') deleteTopic(@Param('id') id: string) { return this.prisma.client.topic.delete({ where: { id } }); }
}
