import { describe, expect, it, vi } from 'vitest';
import { sendCachedJson } from './send-cached-json.js';

function response() {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(),
    end: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('sendCachedJson', () => {
  it('returns 304 for weak and comma-separated matching validators', () => {
    const res = response();
    sendCachedJson(
      { headers: { 'if-none-match': '"other", W/"etag"' } } as never,
      res as never,
      { json: '{}', etag: '"etag"' },
      'public',
    );

    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.end).toHaveBeenCalledOnce();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('sends cached JSON and headers on a miss', () => {
    const res = response();
    sendCachedJson({ headers: {} } as never, res as never, { json: '{"ok":true}', etag: '"etag"' }, 'public');

    expect(res.send).toHaveBeenCalledWith('{"ok":true}');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith('ETag', '"etag"');
  });
});
