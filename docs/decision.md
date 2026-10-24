# Auth Cleanup & Hardening — Decisions

Single decision log for `docs/AUTH_IMPLEMENTATION_PLAN.md`. Every implementation
decision is recorded here before the related task is committed.

## Checklist

- [x] C1 — Remove TOTP service and module wiring
- [x] C2 — Remove TOTP from `AuthService`
- [x] C3 — Remove TOTP routes from `AuthController`
- [x] C4 — Drop TOTP tables from Prisma
- [x] C5 — Remove `otplib`
- [x] C6 — Remove TOTP environment config
- [x] C7 — Remove dead duplicate guard
- [ ] C8 — Remove unused packages
- [ ] C9 — Remove unused cache module
- [ ] C10 — Fix stale README
- [ ] G1 — Prevent account takeover via email reuse
- [ ] G2 — Restrict admin sessions to `ADMIN_EMAIL`
- [ ] G3 — Remove insecure non-production secret defaults
- [ ] G4 — Validate OAuth redirect/state handling
- [ ] T1 — Explicit access-token typing
- [ ] T2 — Refresh rotation grace window
- [ ] T3 — Real logout
- [ ] T4 — `logoutAll` invalidates live access tokens
- [ ] T5 — Rename OAuth-state secret
- [ ] A1 — Await security-critical audit writes
- [ ] A2 — Complete audit records
- [ ] M1 — Constant-time cron secret check
- [ ] M2 — Guidebook visibility (report only)
- [ ] M3 — Duplicate route sets (report only)
- [ ] D1 — Fix dependency vulnerabilities
- [ ] V1 — Final verification and report

## Decision log

### D-001 — Work on the plan's dedicated branch

- Branch: `chore/auth-cleanup-hardening`.
- Tasks are implemented strictly in plan order; one task per commit.
- All decisions are recorded in this single file, `docs/decision.md`. No other
  decision/master Markdown file will be created.

### D-002 — Defer owner-only decisions

- M2 and M3 are `DECISION REQUIRED` tasks. They will be documented and reported,
  not changed, as required by the plan.

### D-003 — Combine C1–C3 in one commit

- Deleting `TotpService` (C1) makes the `AuthService` import (C2) and controller
  routes (C3) uncompilable. To keep the branch green after every commit, C1–C3
  are delivered together as one compile-safe cleanup commit.

### D-004 — C4 migration idempotent

- Generate migration with `prisma migrate dev` as instructed. Edit generated
  SQL to use `DROP TABLE IF EXISTS` for `TotpRecoveryCode` and `TotpCredential`
  only (per plan). Do not edit existing migration files.
