import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { serverTimingMiddleware } from './server-timing.middleware.js';

type HeaderValue = string | number | readonly string[];

function createResponse(headersSent = false) {
  const headers = new Map<string, HeaderValue>();
  const writeHead = vi.fn();
  const setHeader = vi.fn((name: string, value: HeaderValue) => {
    headers.set(name, value);
  });
  const response = {
    headersSent,
    setHeader,
    writeHead,
  } as unknown as Response;

  return { headers, response, writeHead };
}

describe('serverTimingMiddleware', () => {
  it('sets a numeric Server-Timing header before headers are written', () => {
    const { headers, response, writeHead } = createResponse();
    const next = vi.fn() as NextFunction;

    serverTimingMiddleware({} as Request, response, next);
    response.writeHead(200);

    const timing = headers.get('Server-Timing');
    expect(next).toHaveBeenCalledOnce();
    expect(timing).toMatch(/^app;dur=\d+\.\d$/);
    expect(Number(String(timing).split('=')[1])).toBeGreaterThanOrEqual(0);
    expect(writeHead).toHaveBeenCalledWith(200);
  });

  it('skips the header when headers have already been sent', () => {
    const { headers, response, writeHead } = createResponse(true);
    const next = vi.fn() as NextFunction;

    serverTimingMiddleware({} as Request, response, next);
    response.writeHead(204);

    expect(headers.has('Server-Timing')).toBe(false);
    expect(writeHead).toHaveBeenCalledWith(204);
  });
});
