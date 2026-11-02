# S1 — Scope `cookie-session` to `/auth`

## Context

`cookie-session` currently runs globally, so every request parses and may
serialise the signed `oauth-state` cookie. Only the Google OAuth flow needs the
session: the strategy stores anti-forgery state during `/auth/google` and reads
it on `/auth/google/callback`.

## Options considered

### 1. Keep `cookie-session` global

Rejected. It adds cookie parsing and signing work to every route, including
public guidebook reads that never use a session.

### 2. Replace `cookie-session` with a custom state store

Rejected. It would change the OAuth flow and add risk for a small performance
win.

### 3. Mount the existing middleware on `/auth`

Chosen. Express will run the unchanged `cookie-session` middleware only for
`/auth` and its subpaths, which covers both OAuth endpoints.

## Design

Change only the registration:

```ts
app.use('/auth', cookieSession({ /* existing options unchanged */ }));
```

No cookie name, secret, security flags, or max age change.

## Trade-offs

- `req.session` is no longer available outside `/auth`. No application code
  reads it there; the access-token and refresh-cookie flow remains unchanged.
- Public and authenticated non-auth responses no longer run cookie-session
  parsing and cannot receive its `Set-Cookie` header.
- `/auth` responses keep the same OAuth state cookie behaviour and the existing
  stronger private cache headers.

## Verification

- `GET /roadmaps` returns no `Set-Cookie`.
- `/auth/google` still starts the OAuth flow and can set the state cookie.
- `npm run build`, `npm test`, and `npm run lint`.
