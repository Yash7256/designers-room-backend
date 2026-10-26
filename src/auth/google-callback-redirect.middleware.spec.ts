import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { GoogleCallbackRedirectMiddleware } from './google-callback-redirect.middleware.js';

function request(cookie?: string): Request {
  return {
    headers: cookie ? { cookie } : {},
    originalUrl: '/auth/google/callback?code=abc&state=xyz',
  } as Request;
}

function response() {
  return { redirect: vi.fn() } as unknown as Response & { redirect: ReturnType<typeof vi.fn> };
}

describe('GoogleCallbackRedirectMiddleware', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('continues when the OAuth state cookie is present', () => {
    vi.stubEnv('WEB_APP_URL', 'https://designersroom.vercel.app');
    const next = vi.fn() as NextFunction;
    const res = response();

    new GoogleCallbackRedirectMiddleware().use(
      request('oauth-state=value; oauth-state.sig=signature'),
      res,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('bounces to the web app proxy when the OAuth state cookie is absent', () => {
    vi.stubEnv('WEB_APP_URL', 'https://designersroom.vercel.app/');
    const next = vi.fn() as NextFunction;
    const res = response();

    new GoogleCallbackRedirectMiddleware().use(request(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      'https://designersroom.vercel.app/api/auth/google/callback?code=abc&state=xyz',
    );
  });
});
