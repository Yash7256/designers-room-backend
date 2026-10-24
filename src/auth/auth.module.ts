import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { TokenService } from './token.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { AuditService } from './audit.service.js';
import { CleanupJob } from './cleanup.job.js';
import { CleanupService } from './cleanup.service.js';
import { CleanupController } from './cleanup.controller.js';
import { GoogleStrategy } from './google.strategy.js';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
          issuer: 'designers-room',
          audience: 'designers-room-web',
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  controllers: [AuthController, CleanupController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    TokenService,
    JwtAuthGuard,
    RolesGuard,
    AuditService,
    CleanupService,
    ...(process.env['VERCEL'] ? [] : [CleanupJob]),
  ],
  exports: [TokenService],
})
export class AuthModule {}
