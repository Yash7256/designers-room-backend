import type { NextFunction, Request, Response } from 'express';

export const NO_STORE = 'no-store';
export const PUBLIC_GUIDEBOOK =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';

export function defaultCacheControl(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader('Cache-Control', NO_STORE);
  next();
}
