# Performance decisions

Behaviour trade-offs made during the speed pass.

## M1 — Server-Timing header

- **Behaviour:** every response now includes `Server-Timing: app;dur=<ms>`.
  The duration measures request entry to the moment response headers are written.
- **Trade-off:** one extra response header plus two `hrtime` reads and a
  per-request `writeHead` wrapper. The header is exposed in all environments; it
  contains only a numeric duration.
- **Unchanged:** response bodies, status codes, caching, and authentication.

## C1 — Cache header policy

- **Behaviour:** responses default to `Cache-Control: no-store`; guidebook list,
  detail, and topic-content successes use
  `public, max-age=60, s-maxage=300, stale-while-revalidate=86400`. `/auth`
  keeps its stronger private headers.
- **Trade-off:** public guidebook content can be served stale for up to 24 hours
  while revalidating in the background, and edits may take up to the CDN cache
  window (300 seconds) to propagate. The Vercel CDN now caches public guidebook
  responses instead of forwarding every request to the function.
- **Unchanged:** route sets, response bodies, status codes, and auth policy.

## C2 — Database pool size

- **Behaviour:** each process now caps its PostgreSQL pool at `DB_POOL_MAX`
  (default `3`, maximum `20`) instead of the pg default of `10` connections.
- **Trade-off:** serverless instances use fewer database connections and are less
  likely to exhaust Postgres under scale-out, at the cost of lower per-instance
  query concurrency. Persistent servers can raise the value through configuration.
- **Unchanged:** connection string handling, Prisma client behaviour, and schema.

## S1 — Scope `cookie-session` to `/auth`

- **Behaviour:** `cookie-session` now runs only for `/auth` and its subpaths.
  Public and authenticated non-auth responses no longer parse or emit the OAuth
  state cookie.
- **Trade-off:** `req.session` is unavailable outside `/auth`. Nothing currently
  reads it there; the access-token and refresh-cookie flow is unchanged.
- **Unchanged:** OAuth cookie options, login flow, route sets, and response bodies.

## S2 — Cache the per-request user lookup

- **Behaviour:** authenticated requests reuse an in-memory user profile for
  `AUTHZ_CACHE_TTL_SECONDS` (default `30`, max `300`, `0` disables). The JWT
  revocation comparison still runs on every request.
- **Trade-off:** a revoked session or role change can take up to the TTL to apply
  on other serverless instances. Same-instance invalidation after logout, token
  reuse, and profile updates is immediate.
- **Unchanged:** JWT checks, response shapes, database schema, and refresh flow.
