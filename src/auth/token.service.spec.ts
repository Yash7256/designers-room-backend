import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEVELOPMENT_REFRESH_COOKIE, REFRESH_COOKIE, refreshCookieName, refreshCookieOptions, refreshCookieSameSite } from './token.service.js';

describe('refresh cookie', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the __Host- prefixed name in production only', () => {
    expect(refreshCookieName(true)).toBe(REFRESH_COOKIE);
    expect(refreshCookieName(false)).toBe(DEVELOPMENT_REFRESH_COOKIE);
  });

  it('defaults to SameSite=None in production so cross-site SPAs keep the session', () => {
    const options = refreshCookieOptions(true);

    expect(options.sameSite).toBe('none');
    expect(options.secure).toBe(true);
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe('/');
  });

  it('defaults to SameSite=Strict in development', () => {
    const options = refreshCookieOptions(false);

    expect(options.sameSite).toBe('strict');
    expect(options.secure).toBe(false);
  });

  it('honours an explicit COOKIE_SAMESITE', () => {
    vi.stubEnv('COOKIE_SAMESITE', 'lax');

    expect(refreshCookieSameSite(true)).toBe('lax');
    expect(refreshCookieOptions(true).sameSite).toBe('lax');
  });

  it('ignores an invalid COOKIE_SAMESITE', () => {
    vi.stubEnv('COOKIE_SAMESITE', 'bogus');

    expect(refreshCookieSameSite(true)).toBe('none');
    expect(refreshCookieSameSite(false)).toBe('strict');
  });

  it('always marks the cookie secure when SameSite=None', () => {
    vi.stubEnv('COOKIE_SAMESITE', 'none');

    expect(refreshCookieOptions(false).secure).toBe(true);
  });
});
