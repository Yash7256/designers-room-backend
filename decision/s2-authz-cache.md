# S2 — Cache the per-request user lookup

## Context

`JwtStrategy.validate` calls `UsersRepository.findById` on every authenticated
request. The selected profile is small and changes rarely, so the lookup is a
good candidate for a short per-instance cache.

The cache must not weaken the existing token checks: the user must still exist,
the token type and purpose must still be valid, and `sessionsRevokedAt` must
still be compared with the token's `iat`.

## Options considered

### 1. Keep the database lookup on every request

Rejected. It adds a database round trip to every authenticated request even when
the same user makes several requests within seconds.

### 2. Cache the full JWT validation result

Rejected. It would make revocation checks harder to reason about and risks
caching decisions that depend on the token itself.

### 3. Cache only the user profile, keyed by user id

Chosen. The profile contains the fields needed by authorization and
`GET /users/me`. Every request still validates its own JWT payload and performs
the revocation comparison against the cached profile.

## Design

- New `AuthzCacheModule` is `@Global()` and exports `AuthzCacheService`.
- `AuthzCacheService` stores
  `Map<string, { profile: UserProfile; expiresAt: number }>`.
- Maximum size: 5000 entries. When full, the oldest inserted entry is evicted.
- TTL: `AUTHZ_CACHE_TTL_SECONDS`, validated as an integer from 0 to 300 with a
  default of 30.
- `0` disables caching entirely; each lookup reaches `UsersRepository`.
- A miss calls `UsersRepository.findById`. A `null` result is never stored.
- `get` removes stale entries before loading, and `invalidate`/`clear` remove
  entries explicitly.
- `JwtStrategy.validate` keeps all existing payload checks and the
  `sessionsRevokedAt` comparison, then returns
  `{ userId, role, profile }`.
- `UsersController.getProfile` returns `request.user.profile`; no extra query.
- Invalidation happens after the database write succeeds in:
  - `TokenService.revoke`
  - `TokenService.revokeAll`
  - the reuse-detected branch of `TokenService.rotate`
  - `UsersService.updateProfile`

## Trade-offs

- Same-instance invalidation is immediate, so a logout or profile update is
  reflected on the next request handled by that instance.
- Other serverless instances can serve a stale cached profile for up to the TTL.
  A revoked session or role change may therefore take up to TTL seconds to apply
  elsewhere. The default is 30 seconds and the maximum is 300 seconds.
- A cache hit avoids the database round trip and the repeated profile select, at
  the cost of a small in-memory map per process.
- `GET /users/me` now returns the profile attached during JWT validation. Its
  shape is unchanged because the cached value is the same `UserProfile` select.

## Verification

- Cache hit: zero repository calls after the first load.
- Cache miss: one repository call.
- `invalidate` forces the next lookup to hit the repository.
- TTL `0` disables caching.
- A token issued at or before `sessionsRevokedAt` is still rejected.
- `npm run build`, `npm test`, and `npm run lint`.
