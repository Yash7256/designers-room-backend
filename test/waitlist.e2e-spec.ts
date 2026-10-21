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
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
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

describe('Waitlist (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;

  const unique = Date.now();
  const email = `waitlist-e2e-${unique}@example.com`;

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

    const admin = await prisma.client.user.upsert({
      where: { email: 'waitlist-e2e-admin@example.com' },
      create: {
        email: 'waitlist-e2e-admin@example.com',
        name: 'Waitlist E2E Admin',
        role: 'ADMIN',
      },
      update: {},
    });
    const user = await prisma.client.user.upsert({
      where: { email: 'waitlist-e2e-user@example.com' },
      create: {
        email: 'waitlist-e2e-user@example.com',
        name: 'Waitlist E2E User',
        role: 'USER',
      },
      update: {},
    });
    adminToken = signAccessToken(admin.id);
    userToken = signAccessToken(user.id);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /waitlist', () => {
    it('accepts a mixed-case email and returns 201 { ok: true }', async () => {
      const res = await request(app.getHttpServer())
        .post('/waitlist')
        .send({ email: email.toUpperCase() })
        .expect(201);

      expect(res.body).toEqual({ ok: true });
    });

    it('stores the email lowercased and trimmed exactly once (idempotent)', async () => {
      const res = await request(app.getHttpServer())
        .post('/waitlist')
        .send({ email })
        .expect(201);

      expect(res.body).toEqual({ ok: true });

      const count = await prisma.client.waitlistEntry.count({
        where: { email },
      });
      expect(count).toBe(1);
    });

    it('rejects a malformed email with 400', () => {
      return request(app.getHttpServer())
        .post('/waitlist')
        .send({ email: 'nope' })
        .expect(400);
    });

    it('rejects undeclared fields with 400', () => {
      return request(app.getHttpServer())
        .post('/waitlist')
        .send({ email: 'extra@example.com', role: 'ADMIN' })
        .expect(400);
    });
  });

  describe('GET /admin/waitlist', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer()).get('/admin/waitlist').expect(401);
    });

    it('returns 403 for a non-admin token', () => {
      return request(app.getHttpServer())
        .get('/admin/waitlist')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('returns cursor-paginated entries for an admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/waitlist?limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBe(1);
      expect(res.body).toHaveProperty('nextCursor');
      expect(res.body.nextCursor).not.toBeNull();
      expect(Object.keys(res.body.items[0]).sort()).toEqual([
        'createdAt',
        'email',
        'id',
        'source',
      ]);
    });
  });

  describe('POST /waitlist rate limiting', () => {
    it('returns 429 after more than 5 posts per minute', async () => {
      // 4 requests already consumed the 5/min budget above; the first request
      // below is the 5th (allowed) and the second is the 6th (throttled).
      await request(app.getHttpServer())
        .post('/waitlist')
        .send({ email: `waitlist-e2e-flood-1-${unique}@example.com` })
        .expect(201);

      return request(app.getHttpServer())
        .post('/waitlist')
        .send({ email: `waitlist-e2e-flood-2-${unique}@example.com` })
        .expect(429);
    });
  });
});
