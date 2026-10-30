# Challenges Feature: Implementation Plan (Beta)

## Stack
TypeScript, NestJS (Express), PostgreSQL, Prisma, Redis, BullMQ, Swagger, Docker. Modular monolith.

## Decisions
- [ ] Timezone: IST or UTC
- [ ] Resubmission: one shot
- [ ] AI provider
- [ ] Daily AI cap
- [ ] Answers public/private
- [ ] Weekend unlock rule

## Phases
1. Foundation (schema, modules)
2. Calendar & Challenges
3. Attempts
4. Grading (auto + AI)
5. Scoring/Streaks/Badges
6. Leaderboard
7. Admin/Caching/Hardening

## Change Log
===thought process===
Phase 1: Added Prisma models/enums for challenges feature (Week, Challenge, Rubric, Attempt, Grade, XpLedger, WeeklyScore, Badge, UserBadge, UserStreak) with relations on User and indexes as specified. Will generate migration/client.
---
Phase 1b: Ran prisma generate. Prisma client updated with new models.
---
Thought: Added Public decorator and updated JwtAuthGuard to respect @Public() for public endpoints as per challenge calendar/challenges requirements.
---
Thought: Implemented CalendarModule (weeks/current, weeks, unlock logic) and ChallengesModule (list by week with per-user status, get challenge without answerKey). Added Public decorator support.
---
Thought: Implemented Attempts module - start (with unlock checks), autosave, submit with transaction + grading trigger, get attempt. One attempt per challenge enforced by unique constraint.
---
Thought: Implemented GradingService with auto-grader for MCQ/ORDERING (writes Grade, XP to ledger, updates WeeklyScore in same tx), AI types set to GRADING and enqueued via QueuesService. Queues module added as placeholder (BullMQ structure ready).
---
Thought: Added Scoring module with progress, streak, badges, and week summary endpoints.
---
Thought: Added Leaderboard module with weekly and all-time endpoints (Postgres source of truth as specified).
---
Thought: Added AdminChallenges module with CRUD for weeks/challenges/rubrics, publish, bulk import, regrade endpoint (role-protected).
---
Thought: Wired all new modules into AppModule.
---
Thought: TypeScript compiles cleanly after fixing PrismaService usage patterns.
---

## Implementation Summary
- Added Prisma schema for Challenges Beta (Week, Challenge, Rubric, Attempt, Grade, XpLedger, WeeklyScore, Badge, UserBadge, UserStreak) with enums and relations; ran prisma generate.
- Added Public decorator and updated JwtAuthGuard.
- CalendarModule: GET /weeks/current, GET /weeks, unlock logic by (startsAt + (day-1) days).
- ChallengesModule: GET /weeks/:id/challenges (locked for future days, per-user status), GET /challenges/:id (no answerKey).
- AttemptsModule: POST /challenges/:id/start, PUT /attempts/:id/answer, POST /attempts/:id/submit, GET /attempts/:id (one attempt per challenge).
- GradingModule: auto-grade MCQ/ORDERING in-transaction writing Grade + XP ledger + WeeklyScore (skip XP if week ARCHIVED); AI types queued to GRADING.
- ScoringModule: GET /me/progress, /me/streak, /me/badges, GET /weeks/:id/summary.
- LeaderboardModule: GET /leaderboard/weekly, /leaderboard/all-time (Postgres source of truth).
- AdminChallengesModule: CRUD weeks/challenges/rubrics, publish, import, regrade (ADMIN only).
- Wired all modules into AppModule.
