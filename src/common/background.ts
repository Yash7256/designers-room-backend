import { waitUntil } from '@vercel/functions';

function logBackgroundFailure(error: unknown): void {
  console.error(
    'Background task failed',
    error instanceof Error ? error.stack : String(error),
  );
}

/** Schedule work without making the request depend on its completion. */
export async function runInBackground(promise: Promise<unknown>): Promise<void> {
  if (process.env['VERCEL']) {
    try {
      waitUntil(promise);
      return;
    } catch (error) {
      logBackgroundFailure(error);
      try {
        await promise;
      } catch (promiseError) {
        logBackgroundFailure(promiseError);
      }
      return;
    }
  }

  void promise.catch(logBackgroundFailure);
}
