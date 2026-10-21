import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { RoadmapsModule } from './roadmaps/roadmaps.module.js';
import { UsersModule } from './users/users.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { AdminModule } from './admin/admin.module.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';
import { ScheduleModule } from '@nestjs/schedule';

const configModule = ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: envValidationSchema,
});

// The validation error rejects this promise; keep it from becoming an
// unhandled rejection that kills the process before Nest can report it.
void configModule.catch(() => undefined);

@Module({
  imports: [
    configModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    ...(process.env['VERCEL'] ? [] : [ScheduleModule.forRoot()]),
    CacheModule.register({ isGlobal: true, ttl: 60_000, max: 500 }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RoadmapsModule,
    HealthModule,
    AdminModule,
    WaitlistModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
