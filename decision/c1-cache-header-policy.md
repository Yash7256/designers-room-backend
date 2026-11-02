# C1 — Fix the cache header policy

## Context

`vercel.json` applies `Cache-Control: no-store` to every response. That platform
header overrides the public cache headers set by the guidebook controllers, so
the CDN never stores guidebook reads.

At the same time, private and authenticated endpoints must continue to default
to `no-store` when a controller does not set an explicit policy.

## Constraints

- Keep `buildCommand`, `outputDirectory`, `functions`, `rewrites`, and `crons`
  unchanged in `vercel.json`.
- Do not remove either guidebook route set; that is a separate decision.
- Set public caching only after a guidebook service call succeeds, so errors keep
  the default `no-store`.
- Preserve the stronger auth headers (`no-store, no-cache, must-revalidate,
  private`, plus `Pragma` and `Expires`).
- No schema changes, no new migrations, no new dependencies.

## Options considered

### 1. Keep platform caching disabled

Rejected. It guarantees freshness for every response, but makes the public
guidebook headers ineffective and forces every CDN request to the function.

### 2. Set a platform-wide public cache policy

Rejected. Guidebook responses can be public, but `/auth`, `/users/me`, progress,
and admin responses must not be cached by shared caches.

### 3. Default to `no-store` in the app, override per public route

Chosen. A first-party middleware sets `Cache-Control: no-store` on every
response. Guidebook list, detail, and topic-content handlers replace it with the
shared `PUBLIC_GUIDEBOOK` policy only after their service call returns. The auth
middleware continues to apply its stronger private headers.

## Design

- `vercel.json`: remove only the top-level `headers` block.
- `src/common/http/cache-control.ts`:
  - `NO_STORE = 'no-store'`
  - `PUBLIC_GUIDEBOOK = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'`
  - Also exports the small default-cache middleware so it can be unit tested
    without bootstrapping Nest.
- `src/main.ts`: register the default-cache middleware after Server-Timing and
  before the existing `/auth` block.
- `roadmaps.controller.ts` and `guidebook.controller.ts`: use
  `PUBLIC_GUIDEBOOK` for list, detail, and topic content. Header assignment stays
  after the awaited service call.
- Unit tests cover the default `no-store` header and next invocation.

## Trade-offs

- Public guidebook responses may now be cached for 60 seconds in browsers and
  300 seconds in shared caches, with stale content allowed for up to 24 hours
  while revalidation happens in the background. Content edits can therefore take
  up to the revalidation window to become visible to all clients.
- Private endpoints keep the safe default (`no-store`), but every response now
  receives an explicit app-level header unless a controller overrides it.
- The stronger auth headers still win because the auth middleware runs after the
  default middleware for `/auth` requests.
- This changes edge/browser caching behaviour only; response bodies and status
  codes are unchanged.

## Verification

- Unit tests for the default-cache middleware.
- `GET /roadmaps` includes `s-maxage=300`.
- `GET /users/me` includes `Cache-Control: no-store`.
- `/auth/*` includes the stronger private `no-store` policy.
- `vercel.json` has no top-level `headers` key.
- `npm run build`, `npm test`, and `npm run lint`.
