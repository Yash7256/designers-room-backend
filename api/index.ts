import type { Request, Response } from 'express';
import { createNestApp } from '../src/main.js';

type ExpressHandler = (req: Request, res: Response) => unknown;

let handlerPromise: Promise<ExpressHandler> | undefined;

async function getHandler(): Promise<ExpressHandler> {
  if (!handlerPromise) {
    handlerPromise = createNestApp().then(async (app) => {
      await app.init();
      return app.getHttpAdapter().getInstance() as ExpressHandler;
    });
  }
  return handlerPromise;
}

function redact(message: string): string {
  return message.replace(/:\/\/[^:\s/]+:[^@\s]+@/g, '://***:***@');
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const expressHandler = await getHandler();
    expressHandler(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Backend failed to start:', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        statusCode: 500,
        message: 'Backend failed to start',
        detail: redact(message),
      }),
    );
  }
}
