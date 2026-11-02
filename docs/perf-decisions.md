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
