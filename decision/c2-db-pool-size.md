# C2 — Database pool size

## Context

`PrismaService` creates `PrismaPg` with only a connection string, so the pg pool
uses its default maximum of 10 connections per process. Serverless instances can
multiply that default quickly and exhaust PostgreSQL connections.

Pool sizing also belongs in configuration because a persistent server can safely
hold more connections than an ephemeral function instance.

## Constraints

- Keep the pool size bounded: minimum 1, maximum 20.
- Default to 3 for serverless safety.
- Read the value through `ConfigService`.
- No schema changes, no new migrations, no new dependencies.

## Decision

Add `DB_POOL_MAX` to the validated environment schema with
`Joi.number().integer().min(1).max(20).default(3)`. `PrismaService` reads it with
the same default and passes it to `PrismaPg`:

```ts
new PrismaPg({ connectionString, max });
```

Document the setting in `.env.example` and the README environment table so
persistent deployments can raise it without changing code.

## Trade-offs

- Three connections per serverless instance reduces the chance of exhausting the
  database during traffic spikes, but a single instance has less parallelism.
- Persistent servers can restore higher concurrency through configuration; the
  value is capped at 20 to prevent accidental database exhaustion.
- The default is duplicated in Joi and the service fallback. Joi remains the
  source of truth for validated environments; the service fallback keeps direct
  construction safe in tests and scripts.

## Verification

- Env validation tests cover the default and bounds.
- Unit test asserts the configured value reaches `PrismaPg`.
- `npm run build`, `npm test`, and `npm run lint`.
