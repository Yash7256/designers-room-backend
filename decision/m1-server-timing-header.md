# M1 — Server-Timing header

## Context

The API has no lightweight way to see how long the server spends handling a
request before response headers are written. We need an opt-in-friendly signal
that works locally and in production without adding an APM vendor or changing
response bodies.

## Constraints

- Middleware must be the first registered middleware in `createNestApp`.
- It must record time from request entry until headers are about to be written.
- It must never break a response.
- It must skip adding a header if headers have already been sent.
- No schema changes, no new migrations, no new dependency unless justified.

## Options considered

### 1. Add `on-headers`

`on-headers` is a small, focused package that runs a callback immediately before
headers are flushed.

Rejected because wrapping `res.writeHead` directly is straightforward in this
codebase and avoids adding a runtime dependency for one hook.

### 2. Use a Nest interceptor

Interceptors run inside the Nest request pipeline, after Express middleware.

Rejected because the metric would exclude middleware work and would not cover
responses produced before Nest routing. The requirement is server timing from
request start, so a first Express middleware is the better boundary.

### 3. Wrap `res.writeHead`

Chosen. The middleware captures a monotonic start time and replaces the response
instance's `writeHead` method. Immediately before delegating to the original
method, it sets the header if headers are not already sent.

`res.end()` and `res.write()` ultimately trigger an implicit `writeHead`, so the
wrapper also covers responses that do not explicitly call `writeHead`.

## Design

- New file: `src/common/middleware/server-timing.middleware.ts`.
- Exported function middleware with Express `Request`, `Response`, and
  `NextFunction` types.
- Duration uses `process.hrtime.bigint()` and is converted to milliseconds with
  one decimal place: `app;dur=12.3`.
- Header setting is guarded by `res.headersSent`.
- Instrumentation failures are swallowed; the original `writeHead` still runs.
- Middleware registration is the first `app.use(...)` call in `createNestApp`.
- Unit tests cover the numeric header and the already-sent skip path.

## Trade-offs

- Every response gains one additional header. That is intentional and observable.
- Each request patches one response method and calls `hrtime` twice. The overhead
  is negligible compared with routing, database access, and serialization.
- The duration stops when headers are written, not when the response body
  finishes streaming. This matches the requested `Server-Timing` semantics for
  application time before the response begins.
- `Server-Timing` is visible in every environment, including production. It does
  not expose request data, secrets, or internal identifiers.

## Verification

- Unit tests assert the header exists and contains a numeric duration.
- Unit tests assert the header is skipped when headers are already sent.
- `npm run build`
- `npm test`
- `npm run lint`
- `curl -i http://localhost:3000/health/live` returns a `Server-Timing` header.
