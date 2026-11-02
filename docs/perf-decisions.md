# Performance decisions

Behaviour trade-offs made during the speed pass.

## M1 — Server-Timing header

- **Behaviour:** every response now includes `Server-Timing: app;dur=<ms>`.
  The duration measures request entry to the moment response headers are written.
- **Trade-off:** one extra response header plus two `hrtime` reads and a
  per-request `writeHead` wrapper. The header is exposed in all environments; it
  contains only a numeric duration.
- **Unchanged:** response bodies, status codes, caching, and authentication.
