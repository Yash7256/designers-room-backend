import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import 'dotenv/config';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/database/prisma.service.js';
import { R2StorageService } from './../src/guidebook/r2-storage.service.js';

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
    await prisma.client.guidebookTopic.deleteMany({
      where: { title: { startsWith: 'E2E topic' } },
    });
    await app.close();
  });

  describe('POST /admin/guidebook/topics', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer())
        .post('/admin/guidebook/topics')
        .field('title', 'E2E topic')
        .attach('file', Buffer.from(markdown), 'topic.md')
        .expect(401);
    });

    it('returns 403 for a non-admin token', () => {
      return request(app.getHttpServer())
        .post('/admin/guidebook/topics')
        .set('Authorization', `Bearer ${userToken}`)
        .field('title', 'E2E topic')
        .attach('file', Buffer.from(markdown), 'topic.md')
        .expect(403);
    });

    it('rejects a file that is not markdown', () => {
      return request(app.getHttpServer())
        .post('/admin/guidebook/topics')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'E2E topic')
        .attach('file', Buffer.from(markdown), 'topic.exe')
        .expect(400);
    });

    it('rejects a request without a file', () => {
      return request(app.getHttpServer())
        .post('/admin/guidebook/topics')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'E2E topic')
        .expect(400);
    });

    it('stores the topic and the markdown object', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/guidebook/topics')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'E2E topic')
        .field('summary', 'A topic created by the e2e suite')
        .attach('file', Buffer.from(markdown), 'topic.md')
        .expect(201);

      expect(res.body.title).toBe('E2E topic');
      expect(res.body.slug).toBe('e2e-topic');
      expect(res.body.objectKey).toBeUndefined();

      const stored = await prisma.client.guidebookTopic.findUnique({
        where: { id: res.body.id },
      });
      expect(stored).not.toBeNull();
      expect(storage.objects.size).toBe(1);
      expect([...storage.objects.values()][0]?.body.toString('utf-8')).toBe(markdown);
    });
  });

  describe('GET /guidebook/topics', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer()).get('/guidebook/topics').expect(401);
    });

    it('lists the topics for a signed-in user', async () => {
      const res = await request(app.getHttpServer())
        .get('/guidebook/topics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      const topic = res.body.items.find((item: { title: string }) => item.title === 'E2E topic');
      expect(topic).toBeDefined();
      expect(topic.objectKey).toBeUndefined();
    });

    it('returns the markdown content', async () => {
      const list = await request(app.getHttpServer())
        .get('/guidebook/topics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      const topic = list.body.items.find((item: { title: string }) => item.title === 'E2E topic');

      const res = await request(app.getHttpServer())
        .get(`/guidebook/topics/${topic.id}/content`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.text).toBe(markdown);
      expect(res.headers['content-type']).toContain('text/markdown');
    });

    it('returns 404 for an unknown topic', () => {
      return request(app.getHttpServer())
        .get('/guidebook/topics/does-not-exist')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('admin mutations', () => {
    it('updates the topic metadata and replaces the document', async () => {
      const list = await request(app.getHttpServer())
        .get('/guidebook/topics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      const topic = list.body.items.find((item: { title: string }) => item.title === 'E2E topic');

      const res = await request(app.getHttpServer())
        .patch(`/admin/guidebook/topics/${topic.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'E2E topic updated')
        .attach('file', Buffer.from('# Chapter two\n'), 'topic.md')
        .expect(200);

      expect(res.body.title).toBe('E2E topic updated');
      expect(storage.objects.size).toBe(1);

      const content = await request(app.getHttpServer())
        .get(`/guidebook/topics/${topic.id}/content`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(content.text).toBe('# Chapter two\n');
    });

    it('reorders the topics', async () => {
      const list = await request(app.getHttpServer())
        .get('/guidebook/topics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      const topic = list.body.items.find(
        (item: { title: string }) => item.title === 'E2E topic updated',
      );

      await request(app.getHttpServer())
        .post('/admin/guidebook/topics/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ id: topic.id, position: 3 }] })
        .expect(201);

      const updated = await prisma.client.guidebookTopic.findUnique({
        where: { id: topic.id },
      });
      expect(updated?.position).toBe(3);
    });

    it('deletes the topic and its object', async () => {
      const list = await request(app.getHttpServer())
        .get('/guidebook/topics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      const topic = list.body.items.find(
        (item: { title: string }) => item.title === 'E2E topic updated',
      );

      await request(app.getHttpServer())
        .delete(`/admin/guidebook/topics/${topic.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const remaining = await prisma.client.guidebookTopic.findUnique({
        where: { id: topic.id },
      });
      expect(remaining).toBeNull();
      expect(storage.objects.size).toBe(0);
    });
  });
});
