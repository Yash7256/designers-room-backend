import type { NextFunction, Request, Response } from 'express';

type WriteHead = Response['writeHead'];

export function serverTimingMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const start = process.hrtime.bigint();
    const originalWriteHead = res.writeHead.bind(res);

    res.writeHead = function (
      this: Response,
      ...args: Parameters<WriteHead>
    ): Response {
      try {
        if (!res.headersSent) {
          const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
          res.setHeader('Server-Timing', `app;dur=${durationMs.toFixed(1)}`);
        }
      } catch {
        // Timing is diagnostic; never prevent the response.
      }

      return originalWriteHead(...args);
    } as WriteHead;
  } catch {
    // Keep the request moving even if instrumentation setup fails.
  }

  next();
}
