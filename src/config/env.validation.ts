import Joi from 'joi';

// On Vercel the app sits behind the Vercel router, so trust one proxy hop by
// default. This makes req.ip and req.protocol (HTTPS detection) correct, which
// Google OAuth state cookies and per-client rate limiting depend on. Set
// TRUST_PROXY=2 when another proxy (e.g. Cloudflare) fronts Vercel.
const onVercel = Boolean(process.env['VERCEL']);

export const envValidationSchema = Joi.object({
  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // JWT / OAuth secrets
  JWT_SECRET: Joi.string().min(32).required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().min(1).required(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
  REFRESH_TOKEN_SECRET: Joi.string().min(32).when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.string().min(32).default('dev-refresh-token-secret-change-me-0000000000') }),

  // TOTP encryption
  TOTP_ENCRYPTION_KEY: Joi.string().min(32).when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.string().min(32).default('dev-totp-encryption-key-change-me-0000000000') }),

  // CORS
  CORS_ORIGINS: Joi.string().min(1).default('http://localhost:3000'),

  // Google account that receives ADMIN role on first successful OAuth login.
  ADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }).required(),

  // Required by the Vercel Cron cleanup endpoint in production.
  CRON_SECRET: Joi.string().min(32).when('NODE_ENV', { is: 'production', then: Joi.required() }),

  // Server
  // The Vercel router is always in front of the function, so on Vercel the
  // effective value is never below 1 even if the variable is set to 0.
  TRUST_PROXY: Joi.number()
    .integer()
    .min(0)
    .max(255)
    .default(onVercel ? 1 : 0)
    .custom((value: number) => (onVercel ? Math.max(value, 1) : value)),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
});
