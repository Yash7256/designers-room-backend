# Deployment

## Vercel backend with Cloudflare DNS

This project exposes a Vercel Node function from `api/index.ts`. The function
initializes Nest once per warm runtime and forwards all requests to the Nest
Express adapter. Local Docker and `npm run start:prod` continue to use the
normal listening server.

### Vercel project settings

Use the repository root as the project root. `vercel.json` supplies the build,
rewrite, no-cache, and cleanup cron configuration. Add these environment
variables in the Vercel project for **Production**, **Preview**, and any
environment used by the frontend:

- `DATABASE_URL` — use a pooled PostgreSQL URL for request traffic.
- `DIRECT_DATABASE_URL` — direct PostgreSQL URL for Prisma migrations. Keep this
  out of browser code and use it in CI or a trusted migration environment.
- `JWT_SECRET`
- `OAUTH_STATE_SECRET`
- `REFRESH_TOKEN_SECRET` (must be different from `OAUTH_STATE_SECRET`)
- `CRON_SECRET` — at least 32 random characters.
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` — for example
  `https://api.example.com/auth/google/callback`.
- `ADMIN_EMAIL`
- `WEB_APP_URL` — the deployed frontend URL.
- `CORS_ORIGINS` — the deployed frontend URL, without a trailing slash.
- `NODE_ENV=production`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` —
  optional Cloudflare R2 credentials for legacy guidebook documents. New
  documents are stored in PostgreSQL (see below).

`TRUST_PROXY` needs no configuration on Vercel: the effective value is never
below `1` (the Vercel router) whenever the `VERCEL` environment variable is
set. That hop of trust is required for HTTPS detection (Google OAuth state
cookies) and for rate limiting to key on the real client IP instead of the
shared proxy IP. Set `TRUST_PROXY=2` when another proxy fronts Vercel (see the
Cloudflare section below).

The Vercel build command runs `npm run prisma:generate && npm run build`, so
Prisma client generation and a full `nest build` type-check gate every deploy.

Run Prisma migrations from CI or a trusted machine with a direct database URL:

```bash
npx prisma migrate deploy --config prisma7.config.ts
```

Do not run migrations from a request handler.

### Guidebook documents

Guidebook Markdown is stored in the `TopicDocument` table in PostgreSQL, so no
object-storage bucket is required. The content endpoint reads the database
document first and only falls back to Cloudflare R2 when a legacy
`Topic.objectKey` is present.

R2 remains optional for legacy documents. If you still need that fallback,
create the bucket in the Cloudflare dashboard and add these variables to the
Vercel project for **Production** and **Preview**:

- `R2_ACCOUNT_ID` — the Cloudflare account id.
- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` — the R2 API token credentials.
- `R2_BUCKET_NAME` — the bucket that stores the documents.

The bucket stays private: the API reads objects through the R2 S3 API. Without
these variables the app still boots and serves database documents normally.

### Cloudflare custom API domain

Create a DNS record for `api` pointing to the Vercel project domain, enable
the Cloudflare proxy, and use **Full (strict)** TLS. Do not enable caching for
API or authentication paths. The Vercel function already sends `Cache-Control:
no-store` for every response.

With the Cloudflare proxy enabled, requests reach Vercel through an extra hop,
so set `TRUST_PROXY=2` in the Vercel project environment (otherwise rate
limiting keys on Cloudflare edge IPs instead of the real client).

Set the Google OAuth authorized redirect URI to the same public callback URL:

```text
https://api.example.com/auth/google/callback
```

Vercel Cron calls `GET /internal/cleanup` with the `CRON_SECRET` bearer token.
The application disables the in-process Nest scheduler on Vercel so cleanup is
performed by that cron invocation instead of depending on a warm process.
