import { Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/public.decorator.js';
import { refreshCookieName, refreshCookieOptions } from './token.service.js';
import type { GoogleIdentity } from './google.strategy.js';

function readCookie(req: Request, name: string): string | undefined {
  return req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

@Throttle({ default: { ttl: 60_000, limit: 5 } })
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request & { user: GoogleIdentity }, @Res() res: Response) {
    const result = await this.authService.loginWithGoogle(req.user, this.authService.metadata(req));
    this.setRefresh(res, result.refresh_token);
    return res.redirect(`${this.webAppUrl()}/auth/callback`);
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.refresh(readCookie(req, this.cookieName()), this.authService.metadata(req));
    this.setRefresh(res, result.refresh_token);
    return { access_token: result.access_token };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(readCookie(req, this.cookieName()));
    this.clearRefresh(res);
    return { success: true };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Req() req: Request & { user: { userId: string } }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(req.user.userId);
    this.clearRefresh(res);
    return { success: true };
  }

  private cookieName() { return refreshCookieName(process.env.NODE_ENV === 'production'); }
  private webAppUrl() { return (process.env.WEB_APP_URL ?? 'http://localhost:3000').replace(/\/$/, ''); }
  private setRefresh(res: Response, token: string) { res.cookie(this.cookieName(), token, refreshCookieOptions(process.env.NODE_ENV === 'production')); }
  private clearRefresh(res: Response) { res.clearCookie(this.cookieName(), { ...refreshCookieOptions(process.env.NODE_ENV === 'production'), maxAge: 0 }); }
}
