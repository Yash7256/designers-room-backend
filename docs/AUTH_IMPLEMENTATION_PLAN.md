# designers-room-backend — Auth Cleanup & Hardening Plan

**Audience:** autonomous coding agent (OpenCode, Big Pickle model)
**Repo:** `designers-room-backend` (NestJS + Prisma + Postgres, deployed on Vercel)
**Final auth decision (owner):** Google OAuth 2.0 ("Continue with Google") is the ONLY login method. No TOTP/OTP/MFA, no passwords, no email/OTP flows.

---

## 0. Agent rules (read first, apply to every task)

1. Work on a new branch: `git checkout -b chore/auth-cleanup-hardening`.
2. **One task = one commit.** Commit message: `<task-id>: <short summary>`.
3. Before editing any file, **read it in full**. Line numbers below are hints from an audit and may have drifted; match by symbol/name, not line number.
4. After every task run: `npm run build && npm test`. If either fails, fix before moving on. Never leave the branch red.
5. **Never edit or delete an existing file under `prisma/migrations/`.** (One was already rewritten after being applied and caused DB drift.) Only add new migrations via `npx prisma migrate dev --name <name>`.
6. Do not touch anything outside the scope of the current task. No drive-by refactors, no formatting-only changes.
7. If a task says **DECISION REQUIRED**, do not guess. Skip it, list it in the final report.
8. Do not log, print, or commit secrets. Never add real secrets to `.env.example` (placeholders only).
9. At the end, produce the report in section 9.

---

## 1. Phase overview

| Phase | Goal | Tasks |
|---|---|---|
| 1 | Cleanup: remove TOTP/MFA and dead auth code | C1–C9 |
| 2 | Google login hardening | G1–G4 |
| 3 | Token / session hardening | T1–T5 |
| 4 | Audit logging | A1–A2 |
| 5 | Misc fixes | M1–M3 |
| 6 | Dependency vulnerabilities | D1 |
| 7 | Final verification and report | V1 |

Execute strictly in order. Phase 1 must be fully done before Phase 2.

---

## 2. Phase 1 — Cleanup (remove TOTP/MFA and dead code)

Why: TOTP is unused but its routes are live (attack surface). An MFA-purpose JWT was also accepted as a full access token. Deleting the feature removes the whole class of bugs.

### C1 — Remove TOTP service and module wiring
- Delete `src/auth/totp.service.ts` (and any `totp.service.spec.ts` if present).
- `src/auth/auth.module.ts`: remove `import { TotpService }` and `TotpService` from `providers` (and `exports` if listed).
- **Done when:** `grep -rn "TotpService" src` returns nothing.

### C2 — Remove TOTP from `AuthService`
File: `src/auth/auth.service.ts`
- Remove the `TotpService` import and constructor param (`private readonly totp: TotpService`).
- Delete methods: `enrollTotp`, `verifyTotp`, `totpChallenge`, `totpRecover`.
- In `loginWithGoogle`: delete the MFA branch (the `totpCredential.findUnique` lookup and the `return { mfaPending: true, mfaToken }`). The method must always end by issuing tokens (`issueTokens`). Update its return type accordingly (no `mfaPending` union).
- **Done when:** `grep -nEi "totp|mfa" src/auth/auth.service.ts` returns nothing.

### C3 — Remove TOTP routes from `AuthController`
File: `src/auth/auth.controller.ts`
- Delete routes: `POST /auth/totp/enroll`, `/totp/verify`, `/totp/challenge`, `/totp/recover` and their handler methods.
- In the Google callback handler: delete the `if ('mfaPending' in result) return res.redirect(.../auth/mfa?token=...)` branch. Callback now always sets auth cookies and redirects to the web app.
- Remove now-unused imports (`Body`, DTOs, `Roles` decorator, etc. — only if no longer used elsewhere in the file).
- **Done when:** `grep -nEi "totp|mfa" src/auth/auth.controller.ts` returns nothing, and Swagger no longer lists `/auth/totp/*`.

### C4 — Drop TOTP tables from Prisma
1. `prisma/schema.prisma`: delete models `TotpCredential` and `TotpRecoveryCode`, and the relation fields on `User`: `totpCredential TotpCredential?` and `totpRecoveryCodes TotpRecoveryCode[]`.
2. Run `npx prisma migrate dev --name drop_totp_tables`.
3. Open the generated `prisma/migrations/<ts>_drop_totp_tables/migration.sql` and make it idempotent:
   ```sql
   DROP TABLE IF EXISTS "TotpRecoveryCode";
   DROP TABLE IF EXISTS "TotpCredential";
   ```
   (Remove any other statements Prisma generated only if they are unrelated drift; if unsure, report instead of deleting.)
4. `npx prisma generate`.
- **Done when:** `grep -rniE "totp" prisma/schema.prisma` returns nothing (old migration files will still mention it — that is expected and must stay), `npx prisma validate` passes.

### C5 — Remove `otplib` dependency
- `npm uninstall otplib`.
- **Done when:** `grep -n otplib package.json` returns nothing; build passes.

### C6 — Remove TOTP environment config
- `src/config/env.validation.ts`: delete the `TOTP_ENCRYPTION_KEY` entry and its comment.
- `src/config/env.validation.spec.ts`: delete the `TOTP_ENCRYPTION_KEY` line from the test env.
- `.env.example`: delete `TOTP_ENCRYPTION_KEY=...`.
- `docs/deployment.md`: delete the `TOTP_ENCRYPTION_KEY` bullet.
- **Done when:** `grep -rn TOTP_ENCRYPTION_KEY . --exclude-dir=node_modules --exclude-dir=.git` returns nothing.

### C7 — Remove dead duplicate guard
- Confirm nothing imports `src/common/guards/jwt-auth.guard.ts` (`grep -rn "common/guards/jwt-auth" src test`).
- If unused, delete it. The live guard is `src/auth/guards/jwt-auth.guard.ts` — do not touch it.

### C8 — Remove unused packages / package.json leftovers
Confirm zero imports first, then remove:
- In `package.json` `allowScripts`-style block: remove entries `"bcrypt@6.0.0": true` and `"argon2@0.45.1": true` (neither package is installed or imported).
- `npm uninstall @types/cookie-session` if it exists and nothing imports `cookie-session` types (note: `cookie-session` itself has 1 import — **keep `cookie-session`**, only check its types package).
- `npm uninstall @nestjs/mau` if present (0 imports).
- **Keep:** `passport-jwt`, `passport-google-oauth20`, `@nestjs/schedule`, `@nestjs/throttler`, `compression`.

### C9 — Remove unused cache module  *(owner approved by "continue")*
- Locate `@nestjs/cache-manager` import (1 hit in `src`, likely `app.module.ts`). Confirm nothing injects `CACHE_MANAGER` or uses `@CacheKey`/`@CacheTTL`/`CacheInterceptor` (`grep -rnE "CACHE_MANAGER|CacheInterceptor|CacheKey|CacheTTL" src`).
- If truly unused: remove the `CacheModule.register(...)` from `AppModule` imports, then `npm uninstall @nestjs/cache-manager cache-manager`.
- If anything uses it: skip this task and report.

### C10 — Fix stale README
File: `README.md`
- Remove rows for `POST /auth/signup` and `POST /auth/login`, and the `SEED_USER_PASSWORD` row.
- Replace the auth section with the real routes: `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me` (verify the actual route list in `auth.controller.ts` and document only what exists).
- State clearly: "Authentication is Google OAuth 2.0 only."

**Phase 1 gate:** `npm run build && npm test` green; `grep -rniE "totp|otplib|mfa" src prisma/schema.prisma package.json .env.example docs README.md` returns nothing.

---

## 3. Phase 2 — Google login hardening

### G1 — Fix account takeover via email reuse  *(was finding #4)*
Files: `src/auth/google.strategy.ts`, `src/auth/auth.service.ts` (`loginWithGoogle`)

Problem: `loginWithGoogle` upserts by email and overwrites `googleId`, so a different Google account claiming the same email can take over an existing user.

Required behavior:
1. `google.strategy.ts`: pass `emailVerified` (from `profile.emails[0].verified` or `profile._json.email_verified`) and the Google `sub` (`profile.id`) into the validated user object. If email is missing → reject.
2. `loginWithGoogle`:
   - Reject (401, audit `LOGIN_REJECTED`) if `emailVerified !== true`.
   - Look up user by `googleId` first. If found → login.
   - Else look up by email (case-normalized to lowercase):
     - Not found → create user with `googleId`, role `USER`.
     - Found with `googleId == null` (e.g. seeded admin) → link by setting `googleId` (allowed only because email is Google-verified).
     - Found with a **different non-null `googleId`** → **reject**, audit `LOGIN_REJECTED` with reason `google_id_mismatch`. **Never overwrite an existing `googleId`.**
3. Lowercase email on every lookup and write.
- **Tests (add to auth service spec):** new user created; returning user logs in via googleId; seeded user (null googleId) gets linked; mismatched googleId rejected and unchanged; unverified email rejected.

### G2 — Admin sessions only for the pinned admin email  *(was finding #5, adapted: no MFA)*
Files: `src/auth/auth.service.ts`, `src/config/env.validation.ts`, `prisma/seed.ts`
- Admin role is never granted through login; it stays DB-controlled (seed / manual).
- In `loginWithGoogle`, after resolving the user: if `user.role === 'ADMIN'` and `user.email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()` → reject and audit `ADMIN_LOGIN_REJECTED`.
- Make `ADMIN_EMAIL` validated in `env.validation.ts` (`Joi.string().email().required()` in production, optional elsewhere).
- Document in `docs/deployment.md`: "Admin access requires the account's role to be ADMIN in the DB and the email to equal ADMIN_EMAIL."
- **Tests:** admin with matching email logs in; ADMIN-role user with different email rejected.

### G3 — Remove insecure non-production secret defaults  *(was finding #6)*
File: `src/config/env.validation.ts`
- `REFRESH_TOKEN_SECRET` (and any other secret): remove `.default('dev-...')` for non-production. Secrets must be `Joi.string().min(32).required()` in **every** environment.
- Update `env.validation.spec.ts`, `.env.example` (placeholder text only), and any CI/test env to provide values.
- **Done when:** app refuses to boot with a missing secret in any `NODE_ENV`; `grep -n "change-me" src` returns nothing.

### G4 — Validate OAuth redirect/state handling
Files: `auth.controller.ts`, `google.strategy.ts`
- Read how the OAuth `state` cookie is created/verified. Confirm: state is random per request, cookie is `HttpOnly`, `Secure` in production, `SameSite=Lax`, short TTL (≤10 min), and is cleared after the callback.
- Confirm the post-login redirect target is built **only** from the configured web app URL (no user-supplied redirect param).
- Fix any deviation. If already correct, make no change and note it in the report.

---

## 4. Phase 3 — Token and session hardening

### T1 — Explicit access-token typing  *(RFC 8725 §3.11, defense in depth)*
Files: `src/auth/token.service.ts` (access token signing), `src/auth/jwt.strategy.ts`
- When signing access tokens add claim `typ: 'access'` (custom claim named `tokenType` is acceptable if `typ` clashes with JWT header handling).
- In `JwtStrategy.validate`: reject (401) unless that claim equals `'access'`, and reject any payload that has a `purpose` claim.
- Keep existing `alg`, `iss`, `aud` pinning unchanged.
- **Tests:** token without claim rejected; token with `purpose` rejected; valid token accepted.

### T2 — Refresh rotation grace window  *(was finding #13)*
File: `src/auth/token.service.ts` (refresh/rotate path)
- Add `REFRESH_GRACE_SECONDS` (default 10, configurable via env validation).
- When a refresh token that is already `usedAt` is presented:
  - If `now - usedAt <= grace` → respond 401 **without** revoking the family (this is a concurrent tab/retry; the client should use the cookie it already received).
  - Else → existing behavior: revoke whole family and audit `TOKEN_REUSE_DETECTED` (with `userId`, see A2).
- **Tests:** reuse within window → 401, family still valid; reuse after window → family revoked.

### T3 — Real logout  *(was finding #14)*
Files: `src/auth/auth.controller.ts`, `src/auth/token.service.ts`
- `POST /auth/logout` must **not** require a valid access token. Mark it `@Public()`, read the refresh cookie, and if present: set `revokedAt = now` on that token and revoke its family. Always clear both cookies and return 204/200 regardless (no oracle).
- Ensure `revokedAt` is actually set wherever tokens/families are revoked (`logout`, `logoutAll`, reuse detection).
- **Tests:** logout with expired access token still revokes refresh family; cookies cleared.

### T4 — `logoutAll` invalidates live access tokens  *(was finding #14)*
Files: `prisma/schema.prisma`, `src/auth/jwt.strategy.ts`, `src/auth/token.service.ts`
1. Add `sessionsRevokedAt DateTime?` to `User`; run `npx prisma migrate dev --name add_sessions_revoked_at`.
2. `logoutAll` and reuse-detection set `sessionsRevokedAt = now` for the user, plus revoke all refresh tokens.
3. `JwtStrategy.validate` already loads the user from DB: reject if `payload.iat * 1000 < user.sessionsRevokedAt.getTime()`.
- **Tests:** access token issued before `logoutAll` is rejected; token issued after works.

### T5 — Separate the OAuth-state secret from naming confusion  *(was finding #16)*
- `REFRESH_TOKEN_SECRET` is misnamed: refresh tokens are opaque and hashed; this secret only signs the OAuth state cookie.
- Rename to `OAUTH_STATE_SECRET` across `env.validation.ts`, spec, `.env.example`, `docs/deployment.md`, and usages. Keep it **different** from `JWT_SECRET`; add a Joi check that they are not equal.
- **Deployment note to include in the report:** owner must add `OAUTH_STATE_SECRET` in Vercel env **before** deploying this commit, then delete the old variable.
- Add to `docs/deployment.md` a short "Secret rotation" section: how to rotate `JWT_SECRET` (all users re-login; acceptable) and `OAUTH_STATE_SECRET`.
- Deferred (do NOT implement now): `kid`-based multi-key rotation.

---

## 5. Phase 4 — Audit logging

### A1 — Await security-critical audit writes  *(was finding #7)*
File: `src/auth/audit.service.ts` and callers
- Add `logCritical(entry): Promise<void>` that awaits the DB write and swallows/logs errors (audit failure must not break login, but the write must complete before the response on serverless).
- Use `await this.audit.logCritical(...)` for: `LOGIN_SUCCESS`, `LOGIN_REJECTED`, `ADMIN_LOGIN_REJECTED`, `TOKEN_REUSE_DETECTED`, `LOGOUT`, `LOGOUT_ALL`.
- Leave low-value events fire-and-forget.

### A2 — Complete audit records
- `TOKEN_REUSE_DETECTED` must include `userId` (available from the token row).
- Include `ipAddress` and `userAgent` for all auth events (use existing `metadata(req)` helper).
- Retention: make it configurable `AUDIT_RETENTION_DAYS` (default 365, was 90) in `cleanup.service.ts` + env validation.

---

## 6. Phase 5 — Misc fixes

### M1 — Constant-time CRON secret check  *(was finding #12)*
File: `src/auth/cleanup.controller.ts`
- Replace `===` comparison with:
  ```ts
  import { createHash, timingSafeEqual } from 'crypto';
  const a = createHash('sha256').update(provided ?? '').digest();
  const b = createHash('sha256').update(expected).digest();
  if (!timingSafeEqual(a, b)) throw new UnauthorizedException();
  ```

### M2 — Guidebook visibility  *(was finding #8)* — **DECISION REQUIRED**
Files: `src/guidebook/guidebook.controller.ts`, `src/guidebook/roadmaps.controller.ts`
- Docs say guidebook content is for signed-in users, but the read endpoints are `@Public()`.
- **Do not change.** List the exact `@Public()` endpoints in the final report so the owner can choose: (a) keep public (update docs), or (b) remove `@Public()` (deny-by-default guard then requires login).

### M3 — Duplicate route sets  *(was finding #15)* — **DECISION REQUIRED**
- `/guidebook` and `/roadmaps` expose overlapping routes. Do not change; list the duplicates in the report.

---

## 7. Phase 6 — Dependency vulnerabilities

### D1 — Fix `npm audit` findings  *(was finding #9)*
Baseline: 9 vulnerabilities (8 high) — `multer` (via `@nestjs/platform-express`), `body-parser`, `mysql2` (via `prisma`), `deepmerge-ts`, `fast-uri`.
1. `npm audit --omit=dev` (record baseline).
2. `npm audit fix` (no `--force`).
3. For anything remaining, upgrade the specific parent: `@nestjs/platform-express`, `@nestjs/common`/`core` to the latest patch within the current major; `prisma` and `@prisma/client` together to the same latest patch.
4. After each upgrade: `npx prisma generate && npm run build && npm test`.
5. Do **not** use `npm audit fix --force` or cross a major version. Anything needing a major bump → list in report.
- **Done when:** `npm audit --omit=dev` shows no high/critical, or the remainder is explained in the report.

---

## 8. Phase 7 — Final verification

### V1 — Checklist (run all, paste results in report)

| Check | Command | Expected |
|---|---|---|
| Build | `npm run build` | passes |
| Tests | `npm test` | all pass |
| Prisma | `npx prisma validate` | valid |
| No TOTP left | `grep -rniE "totp\|otplib\|mfa" src prisma/schema.prisma package.json .env.example docs README.md` | empty |
| No default secrets | `grep -rn "change-me" src` | empty |
| No dead guard | `ls src/common/guards/jwt-auth.guard.ts` | not found |
| Audit | `npm audit --omit=dev` | no high/critical (or explained) |
| Boot w/o secrets | start app with `JWT_SECRET` unset | refuses to start |
| Routes | list routes from Swagger/`auth.controller.ts` | only google, google/callback, refresh, logout, logout-all, me |

Manual behavior tests (via unit/e2e tests, not live Google):
- Google user with unverified email → rejected.
- Same email, different googleId → rejected, googleId unchanged.
- Admin-role user with non-`ADMIN_EMAIL` email → rejected.
- Access token from before `logoutAll` → 401.
- Refresh reuse within grace → 401, family intact; after grace → family revoked.

---

## 9. Final report format (agent must output)

1. Table: task ID → status (done / skipped / blocked) → commit hash.
2. List of **DECISION REQUIRED** items with the exact files/endpoints involved (M2, M3).
3. Deployment notes for the owner:
   - New migrations to run on prod: `drop_totp_tables`, `add_sessions_revoked_at` (use `prisma migrate deploy`).
   - Env changes in Vercel: add `OAUTH_STATE_SECRET`, `ADMIN_EMAIL` (if not set), optional `REFRESH_GRACE_SECONDS`, `AUDIT_RETENTION_DAYS`; remove `TOTP_ENCRYPTION_KEY` and old `REFRESH_TOKEN_SECRET` **after** the new deploy is live.
   - Expect all users to be logged out once (token claim change + secret rename).
4. Anything unexpected found while reading code (do not fix, only report).

---

## 10. Out of scope (do not implement)

- Shared-store rate limiting (Redis/Upstash). Current in-memory Throttler is weak on serverless; recommended later, especially for `/auth/refresh`.
- `kid`-based JWT key rotation / asymmetric signing.
- Any new login method.
