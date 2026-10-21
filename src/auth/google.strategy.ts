import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['openid', 'email', 'profile'],
      state: true,
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleIdentity {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    const emailVerified = profile._json?.['email_verified'];
    if (!email || emailVerified !== true) {
      throw new UnauthorizedException('Google did not provide a verified email address');
    }
    return {
      googleId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0] || 'Google user',
    };
  }
}
