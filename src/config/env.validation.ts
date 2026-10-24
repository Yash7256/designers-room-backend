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

  // CORS
  CORS_ORIGINS: Joi.string().min(1).default('http://localhost:3000'),

  // SameSite policy for the refresh cookie. Production defaults to 'none' when
  // the API and the SPA are served from different sites (separate *.vercel.app
  // hosts are different sites, since vercel.app is a public suffix): the
  // browser then treats the frontend's API calls as cross-site and would drop
  // a SameSite=Strict cookie. Set 'strict' or 'lax' when the API is served
  // from the same site as the SPA.
  COOKIE_SAMESITE: Joi.string()
    .valid('strict', 'lax', 'none')
    .default((parent) => (parent.NODE_ENV === 'production' ? 'none' : 'strict')),

  // Google account that receives ADMIN role on first successful OAuth login.
  ADMIN_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() }),

  // Required by the Vercel Cron cleanup endpoint in production.
  CRON_SECRET: Joi.string().min(32).when('NODE_ENV', { is: 'production', then: Joi.required() }),

  // Cloudflare R2 object storage. All four variables are optional so the app
  // boots without them, but they must be set together for the guidebook
  // Markdown uploads and reads to work.
  R2_ACCOUNT_ID: Joi.string().optional(),
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_BUCKET_NAME: Joi.string().optional(),

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
