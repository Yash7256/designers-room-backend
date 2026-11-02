import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { NO_STORE, defaultCacheControl } from './cache-control.js';

describe('defaultCacheControl', () => {
  it('sets no-store by default and continues', () => {
    const setHeader = vi.fn();
    const next = vi.fn() as NextFunction;

    defaultCacheControl(
      {} as Request,
      { setHeader } as unknown as Response,
      next,
    );

    expect(setHeader).toHaveBeenCalledWith('Cache-Control', NO_STORE);
    expect(next).toHaveBeenCalledOnce();
  });
});
