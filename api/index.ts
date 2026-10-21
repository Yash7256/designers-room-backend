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

export default async function handler(req: Request, res: Response): Promise<void> {
  const expressHandler = await getHandler();
  expressHandler(req, res);
}
