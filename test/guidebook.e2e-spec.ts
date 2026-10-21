import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import 'dotenv/config';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/database/prisma.service.js';
import { R2StorageService } from './../src/storage/r2-storage.service.js';

function signAccessToken(userId: string): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET is not set');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      iat: now,
      exp: now + 900,
      iss: 'designers-room',
      aud: 'designers-room-web',
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

class InMemoryStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body, contentType });
  }

  async getObject(key: string): Promise<{ body: string; contentType: string; sizeBytes: number }> {
    const object = this.objects.get(key);
    if (!object) {
      throw new NotFoundException('Guidebook document not found');
    }
    return {
      body: object.body.toString('utf-8'),
      contentType: object.contentType,
      sizeBytes: object.body.byteLength,
    };
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

describe('Guidebook (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let storage: InMemoryStorage;
  let adminToken: string;
  let userToken: string;
  let roadmapId: string;
  let topicId: string;

  const markdown = '# Chapter one\n\nWelcome to the guidebook.\n';

  beforeAll(async () => {
    storage = new InMemoryStorage();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(R2StorageService)
      .useValue(storage)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const admin = await prisma.client.user.upsert({
      where: { email: 'guidebook-e2e-admin@example.com' },
      create: {
        email: 'guidebook-e2e-admin@example.com',
        name: 'Guidebook E2E Admin',
        role: 'ADMIN',
      },
      update: {},
    });
    const user = await prisma.client.user.upsert({
      where: { email: 'guidebook-e2e-user@example.com' },
      create: {
        email: 'guidebook-e2e-user@example.com',
        name: 'Guidebook E2E User',
        role: 'USER',
      },
      update: {},
    });
    adminToken = signAccessToken(admin.id);
    userToken = signAccessToken(user.id);
  });

  afterAll(async () => {
    if (roadmapId) {
      await prisma.client.roadmap.deleteMany({ where: { id: roadmapId } });
    }
    await prisma.client.roadmap.deleteMany({
      where: { title: { startsWith: 'E2E guidebook' } },
    });
    await app.close();
  });

  describe('admin content management', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer())
        .post('/admin/roadmaps')
        .send({ title: 'E2E guidebook' })
        .expect(401);
    });

    it('returns 403 for a non-admin token', () => {
      return request(app.getHttpServer())
        .post('/admin/roadmaps')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'E2E guidebook' })
        .expect(403);
    });

    it('creates a guidebook, a stage, a checkpoint and a topic', async () => {
      const roadmap = await request(app.getHttpServer())
        .post('/admin/roadmaps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'E2E guidebook', description: 'Created by the e2e suite' })
        .expect(201);
      roadmapId = roadmap.body.id;
      expect(roadmap.body.slug).toBe('e2e-guidebook');

      const stage = await request(app.getHttpServer())
        .post(`/admin/roadmaps/${roadmapId}/stages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'E2E stage', byTheEnd: 'You know the basics', weekLabel: 'Week 1' })
        .expect(201);
      expect(stage.body.position).toBe(1);

      const checkpoint = await request(app.getHttpServer())
        .post(`/admin/stages/${stage.body.id}/checkpoints`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ task: 'E2E checkpoint', timeEstimate: '20 min' })
        .expect(201);
      expect(checkpoint.body.task).toBe('E2E checkpoint');

      const topic = await request(app.getHttpServer())
        .post(`/admin/roadmaps/${roadmapId}/topics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'E2E topic', stage: 1, difficulty: 'beginner', estimatedMinutes: 30 })
        .expect(201);
      topicId = topic.body.id;
      expect(topic.body.stage).toBe(1);
    });

    it('rejects a topic without a title', () => {
      return request(app.getHttpServer())
        .post(`/admin/roadmaps/${roadmapId}/topics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'No title' })
        .expect(400);
    });

    it('rejects unknown fields', () => {
      return request(app.getHttpServer())
        .post(`/admin/roadmaps/${roadmapId}/topics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'E2E topic', unknownField: 'nope' })
        .expect(400);
    });
  });

  describe('topic documents', () => {
    it('rejects a file that is not markdown', () => {
      return request(app.getHttpServer())
        .post(`/admin/roadmaps/${roadmapId}/topics/${topicId}/content`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(markdown), 'topic.exe')
        .expect(400);
    });

    it('rejects a request without a file', () => {
      return request(app.getHttpServer())
        .post(`/admin/roadmaps/${roadmapId}/topics/${topicId}/content`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('stores the markdown object', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admin/roadmaps/${roadmapId}/topics/${topicId}/content`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(markdown), 'topic.md')
        .expect(201);

      expect(res.body.objectKey).toMatch(
        new RegExp(`^roadmaps/${roadmapId}/topics/${topicId}/[0-9a-f-]{36}\\.md$`),
      );
      expect(storage.objects.size).toBe(1);
      expect([...storage.objects.values()][0]?.body.toString('utf-8')).toBe(markdown);
    });

    it('returns the markdown content', async () => {
      const res = await request(app.getHttpServer())
        .get(`/roadmaps/${roadmapId}/topics/${topicId}/content`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.text).toBe(markdown);
      expect(res.headers['content-type']).toContain('text/markdown');
    });

    it('returns 404 for a topic without a document', async () => {
      const topic = await request(app.getHttpServer())
        .post(`/admin/roadmaps/${roadmapId}/topics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'E2E empty topic' })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/roadmaps/${roadmapId}/topics/${topic.body.id}/content`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('guidebook reads', () => {
    it('serves the guidebooks to a guest', async () => {
      const res = await request(app.getHttpServer()).get('/roadmaps').expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('lists the guidebooks with their counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/roadmaps')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      const roadmap = res.body.items.find((item: { id: string }) => item.id === roadmapId);
      expect(roadmap).toBeDefined();
      expect(roadmap.topicCount).toBeGreaterThan(0);
      expect(roadmap.stageCount).toBe(1);
    });

    it('returns the guidebook detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/roadmaps/${roadmapId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.stages).toHaveLength(1);
      expect(res.body.stages[0].checkpoints[0].task).toBe('E2E checkpoint');
      expect(res.body.topics.length).toBeGreaterThan(0);
      expect(res.body.topics.find((topic: { id: string }) => topic.id === topicId).hasContent).toBe(
        true,
      );
    });

    it('returns 400 for an invalid id', () => {
      return request(app.getHttpServer())
        .get('/roadmaps/not-a-valid-cuid')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('returns 404 for an unknown guidebook', () => {
      return request(app.getHttpServer())
        .get('/roadmaps/c000000000000000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('topic progress', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer())
        .get(`/roadmaps/${roadmapId}/progress`)
        .expect(401);
    });

    it('stores the progress of the signed in user', async () => {
      await request(app.getHttpServer())
        .patch(`/roadmaps/${roadmapId}/topics/${topicId}/progress`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'done' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/roadmaps/${roadmapId}/progress`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const entry = res.body.items.find((item: { topicId: string }) => item.topicId === topicId);
      expect(entry.status).toBe('done');
    });

    it('rejects an unknown status', () => {
      return request(app.getHttpServer())
        .patch(`/roadmaps/${roadmapId}/topics/${topicId}/progress`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'finished' })
        .expect(400);
    });

    it('does not expose the progress of another user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/roadmaps/${roadmapId}/progress`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(0);
    });
  });

  describe('admin deletions', () => {
    it('deletes the topic and its object', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/topics/${topicId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const remaining = await prisma.client.topic.findUnique({ where: { id: topicId } });
      expect(remaining).toBeNull();
      expect(storage.objects.size).toBe(0);
    });
  });
});
