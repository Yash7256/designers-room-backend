import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { UsersModule } from './users/users.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';
import { GuidebookModule } from './guidebook/guidebook.module.js';
import { EmailModule } from './email/email.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';

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
    DatabaseModule,
    AuthModule,
    UsersModule,
    HealthModule,
    WaitlistModule,
    GuidebookModule,
    EmailModule,
    CalendarModule,
    ChallengesModule,
    AttemptsModule,
    GradingModule,
    ScoringModule,
    LeaderboardModule,
    AdminChallengesModule,
    QueuesModule,
  ],
  controllers: [AppController],
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

// Challenges modules
import { CalendarModule } from './calendar/calendar.module.js';
import { ChallengesModule } from './challenges/challenges.module.js';
import { AttemptsModule } from './attempts/attempts.module.js';
import { GradingModule } from './grading/grading.module.js';
import { ScoringModule } from './scoring/scoring.module.js';
import { LeaderboardModule } from './leaderboard/leaderboard.module.js';
import { AdminChallengesModule } from './admin-challenges/admin-challenges.module.js';
import { QueuesModule } from './queues/queues.module.js';
