import { afterEach, describe, expect, it, vi } from 'vitest';

const { waitUntil } = vi.hoisted(() => ({
  waitUntil: vi.fn(),
}));

vi.mock('@vercel/functions', () => ({ waitUntil }));

import { runInBackground } from './background.js';

describe('runInBackground', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    waitUntil.mockReset();
  });

  it('does not reject when a local background task fails', async () => {
    vi.stubEnv('VERCEL', '');
    const error = new Error('background failure');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(runInBackground(Promise.reject(error))).resolves.toBeUndefined();
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalled());

    consoleError.mockRestore();
  });

  it('awaits the task if Vercel scheduling throws, without rejecting', async () => {
    vi.stubEnv('VERCEL', '1');
    waitUntil.mockImplementation(() => {
      throw new Error('scheduler unavailable');
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(runInBackground(Promise.resolve())).resolves.toBeUndefined();
    expect(waitUntil).toHaveBeenCalledOnce();

    consoleError.mockRestore();
  });
});
