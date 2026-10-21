import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import 'dotenv/config';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/database/prisma.service.js';

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

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const user = await prisma.client.user.upsert({
      where: { email: 'app-e2e-user@example.com' },
      create: { email: 'app-e2e-user@example.com', name: 'App E2E User' },
      update: {},
    });
    accessToken = signAccessToken(user.id);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /health/live returns ok', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect({ status: 'ok' });
    });
  });

  describe('Auth flow', () => {
    it('POST /auth/refresh returns 401 without a refresh cookie', () => {
      return request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });
  });

  describe('Users', () => {
    it('GET /users/me returns profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('email');
      expect(res.body).not.toHaveProperty('password');
    });

    it('GET /users/me returns 401 without token', () => {
      return request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('Roadmaps', () => {
    it('GET /roadmaps returns paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/roadmaps')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body).toHaveProperty('nextCursor');
    });

    it('GET /roadmaps?limit=5 respects limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/roadmaps?limit=5')
        .expect(200);

      expect(res.body.items.length).toBeLessThanOrEqual(5);
    });

    it('GET /roadmaps/:id with invalid id returns 400', () => {
      return request(app.getHttpServer())
        .get('/roadmaps/not-a-valid-cuid')
        .expect(400);
    });

    it('GET /roadmaps/:id with valid-format but non-existent id returns 404', () => {
      return request(app.getHttpServer())
        .get('/roadmaps/c000000000000000000000000')
        .expect(404);
    });
  });
});
