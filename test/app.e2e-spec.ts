import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
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
    const unique = Date.now();
    const email = `e2e-${unique}@test.example`;

    it('POST /auth/signup creates user and returns token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email, password: 'TestPass123!', name: 'E2E User' })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
    });

    it('POST /auth/signup returns 409 on duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email, password: 'TestPass123!', name: 'E2E User' })
        .expect(409);
    });

    it('POST /auth/login returns token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'TestPass123!' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      accessToken = res.body.access_token as string;
    });

    it('POST /auth/login returns 401 for wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'WrongPassword!' })
        .expect(401);
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
