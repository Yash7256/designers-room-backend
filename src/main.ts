import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import express from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import cookieSession from 'cookie-session';
import helmetImport, { type HelmetOptions } from 'helmet';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

type HelmetFactory = (options?: Readonly<HelmetOptions>) => RequestHandler;

const helmet = helmetImport as unknown as HelmetFactory;

export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const trustProxy = config.get<number>(
    'TRUST_PROXY',
    process.env['VERCEL'] ? 1 : 0,
  );
  const corsOrigins = config
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('origin');
    if (origin && !corsOrigins.includes(origin)) {
      res.status(403).json({ statusCode: 403, message: 'Origin is not allowed' });
      return;
    }
    next();
  });

  // Configure Express trust proxy (for correct IP behind reverse proxies)
  if (trustProxy > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
  }

  // Used only to preserve Google OAuth's short-lived anti-forgery state.
  // Application sessions remain the signed access token plus refresh cookie.
  app.use(
    cookieSession({
      name: 'oauth-state',
      keys: [config.getOrThrow<string>('REFRESH_TOKEN_SECRET')],
      httpOnly: true,
      secure: nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    }),
  );

  // Body size limits — must come before other middleware
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS — only allow configured origins
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, credentials: true });
  }

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter (handles Prisma + HTTP errors)
  app.useGlobalFilters(new AllExceptionsFilter(config));

  // Swagger — disabled in production
  if (nodeEnv !== 'production') {
    const docConfig = new DocumentBuilder()
      .setTitle("Designer's Room API")
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  return app;
}

async function bootstrap() {
  const app = await createNestApp();
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

// Vercel imports createNestApp through api/index.ts. Keep the local server
// entrypoint for Docker and `npm run start:prod`.
if (!process.env['VERCEL']) {
  void bootstrap();
}
