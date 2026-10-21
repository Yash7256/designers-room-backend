import { describe, expect, it } from 'vitest';
import { envValidationSchema } from './env.validation.js';

const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/designers_room?schema=public',
  JWT_SECRET: 'j'.repeat(40),
  REFRESH_TOKEN_SECRET: 'r'.repeat(40),
  TOTP_ENCRYPTION_KEY: 't'.repeat(40),
  CRON_SECRET: 'c'.repeat(40),
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_CALLBACK_URL: 'https://api.example.com/auth/google/callback',
  ADMIN_EMAIL: 'admin@example.com',
};

describe('envValidationSchema', () => {
  it('defaults COOKIE_SAMESITE to none in production', () => {
    const { value, error } = envValidationSchema.validate({ ...base, NODE_ENV: 'production' });

    expect(error).toBeUndefined();
    expect(value.COOKIE_SAMESITE).toBe('none');
  });

  it('defaults COOKIE_SAMESITE to strict outside production', () => {
    const { value, error } = envValidationSchema.validate({ ...base, NODE_ENV: 'development' });

    expect(error).toBeUndefined();
    expect(value.COOKIE_SAMESITE).toBe('strict');
  });

  it('accepts an explicit COOKIE_SAMESITE', () => {
    const { value, error } = envValidationSchema.validate({ ...base, NODE_ENV: 'production', COOKIE_SAMESITE: 'lax' });

    expect(error).toBeUndefined();
    expect(value.COOKIE_SAMESITE).toBe('lax');
  });

  it('rejects an unknown COOKIE_SAMESITE', () => {
    const { error } = envValidationSchema.validate({ ...base, NODE_ENV: 'production', COOKIE_SAMESITE: 'bogus' });

    expect(error).toBeDefined();
  });
});
