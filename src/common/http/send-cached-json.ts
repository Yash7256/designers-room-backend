import type { Request, Response } from 'express';

interface CachedJsonResponse {
  json: string;
  etag: string;
}

function matchesEtag(request: Request, etag: string): boolean {
  const header = request.headers['if-none-match'];
  if (!header) return false;
  const values = Array.isArray(header) ? header : header.split(',');
  return values.some((value) => {
    const candidate = value.trim();
    return candidate === etag || candidate.replace(/^W\//, '') === etag;
  });
}

export function sendCachedJson(
  req: Request,
  res: Response,
  cached: CachedJsonResponse,
  cacheControl: string,
): Response {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('ETag', cached.etag);
  res.setHeader('Cache-Control', cacheControl);
  if (matchesEtag(req, cached.etag)) return res.status(304).end();
  return res.send(cached.json);
}
