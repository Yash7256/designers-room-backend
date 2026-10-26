import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class GoogleCallbackRedirectMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const hasOAuthState = (req.headers.cookie ?? '')
      .split(';')
      .some((part) => {
        const name = part.trim().split('=')[0];
        return name === 'oauth-state' || name === 'oauth-state.sig';
      });

    if (hasOAuthState) {
      next();
      return;
    }

    const queryIndex = req.originalUrl.indexOf('?');
    const query = queryIndex === -1 ? '' : req.originalUrl.slice(queryIndex);
    const webAppUrl = (process.env['WEB_APP_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');

    res.redirect(`${webAppUrl}/api/auth/google/callback${query}`);
  }
}
