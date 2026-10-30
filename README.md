# Designer's Room — Backend API

NestJS 12 + Prisma 7 + PostgreSQL 17 REST API.

## Prerequisites

- Node.js ≥ 22
- Docker + Docker Compose v2

## Quick start (Docker)

```bash
# 1. Copy env file and fill in values
cp .env.example .env.docker
# Set POSTGRES_PASSWORD, JWT_SECRET, DATABASE_URL (host = postgres), etc.

# 2. Build and start all services (runs migrations automatically)
docker compose up --build

# 3. (Optional) Run the seed
docker compose exec app npx prisma db seed --config prisma7.config.ts
```

The API is available at `http://localhost:3000`.  
Swagger UI (development only): `http://localhost:3000/api/docs`.

## Local development (without Docker)

```bash
# Install dependencies
npm ci

# Set up a local Postgres DB and copy .env.example -> .env, adjust DATABASE_URL
cp .env.example .env

# Run migrations
npx prisma migrate deploy --config prisma7.config.ts

# Generate Prisma client
npm run prisma:generate

# Start in watch mode
npm run start:dev
```

## Environment variables

| Variable           | Required | Description                                              |
| ------------------ | -------- | -------------------------------------------------------- |
| `DATABASE_URL`     | ✅       | PostgreSQL connection string (host = `postgres` in Docker) |
| `POSTGRES_PASSWORD`| ✅       | Password for the `postgres` user (used by docker compose) |
| `JWT_SECRET`       | ✅       | ≥ 32-char random secret for signing JWTs                |
| `REFRESH_TOKEN_SECRET` | ✅    | Secret used for OAuth state cookies                     |
| `GOOGLE_CLIENT_ID` | ✅       | Google OAuth client ID                                   |
| `GOOGLE_CLIENT_SECRET` | ✅   | Google OAuth client secret                               |
| `GOOGLE_CALLBACK_URL` | ✅    | Google OAuth callback URL                                |
| `ADMIN_EMAIL`      | ✅       | Google account email to grant ADMIN role                 |
| `RESEND_API_KEY`   | –        | Resend API key; required to send email                  |
| `RESEND_FROM_EMAIL`| –        | Verified Resend sender, e.g. `Designers Room <hello@example.com>` |
| `RESEND_REPLY_TO`  | –        | Optional Reply-To address for transactional email       |
| `PORT`             | –        | HTTP port (default `3000`)                               |
| `NODE_ENV`         | –        | `development` / `production` / `test`                    |
| `CORS_ORIGINS`     | –        | Comma-separated allowed origins (default `http://localhost:3000`) |
| `WEB_APP_URL`      | –        | Frontend URL used after OAuth redirects (default `http://localhost:3000`) |

Generate a JWT secret:

```bash
openssl rand -hex 64
```

## Transactional email (Resend)

`EmailService` is registered globally by `EmailModule`. Set both
`RESEND_API_KEY` and `RESEND_FROM_EMAIL` to enable sending; verify the sending
domain in Resend first. The service adds a 10-second timeout, retries transient
failures once, and reuses an idempotency key so retries do not duplicate mail.

```ts
import { EmailService } from './email/email.service.js';

constructor(private readonly email: EmailService) {}

await this.email.send({
  to: 'user@example.com',
  subject: 'Welcome to Designers Room',
  html: '<p>Hello</p>',
  text: 'Hello',
});
```

`isConfigured()` lets optional workflows skip email when credentials are
absent. A missing configuration throws `ServiceUnavailableException` at send
time; provider failures throw `BadGatewayException`.

## API endpoints

Authentication is Google OAuth 2.0 only.

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/auth/google` | – | Initiate Google OAuth login |
| GET | `/auth/google/callback` | – | Google OAuth callback (sets refresh cookie, redirects) |
| POST | `/auth/refresh` | – | Rotate refresh token (reads `__Host-refresh`/`refresh` cookie) |
| POST | `/auth/logout` | – | Logout (revokes refresh token, clears cookie) |
| POST | `/auth/logout-all` | Bearer | Logout from all sessions |
| GET | `/users/me` | Bearer | Get own profile |
| PATCH | `/users/me` | Bearer | Update name |
| GET | `/roadmaps` | – | Paginated list (`?limit=20&cursor=<id>`) |
| GET | `/roadmaps/:id` | – | Single roadmap with topics |
| GET | `/health/live` | – | Liveness probe |
| GET | `/health/ready` | – | Readiness probe (DB check) |

## Scripts

```bash
npm run build          # Compile TypeScript
npm run start:dev      # Watch mode
npm run lint           # oxlint
npm test               # Unit tests (vitest)
npm run test:e2e       # End-to-end tests
npm run prisma:generate # Regenerate Prisma client
npm run prisma:migrate  # Create + run migration (dev)

# Import guidebook content (stage 1 by default)
npm run guidebook:import

# Import a specific stage's manifest
npm run guidebook:import -- --manifest content/ui-ux/02-layout-and-hierarchy/manifest.json

# Validate a manifest and its Markdown without writing to the database
npm run guidebook:import -- --manifest content/ui-ux/02-layout-and-hierarchy/manifest.json --dry-run
```

Add `--manifest <path>` to import any stage. The manifest path is resolved
relative to the directory you run the command from.
