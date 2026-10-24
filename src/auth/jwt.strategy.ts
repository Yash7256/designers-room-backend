import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from '../users/users.repository.js';

interface JwtPayload {
  sub: string;
  typ?: string;
  purpose?: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer: 'designers-room',
      audience: 'designers-room-web',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.typ !== 'access' || payload.purpose) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.usersRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    const revokedAt = (user as any).sessionsRevokedAt;
    if (revokedAt) {
      const revokedAtMs = new Date(revokedAt).getTime();
      const issuedAtMs = typeof payload.iat === 'number' ? payload.iat * 1000 : 0;
      if (issuedAtMs < revokedAtMs) {
        throw new UnauthorizedException('Token revoked');
      }
    }
    return { userId: user.id, role: user.role };
  }
}
