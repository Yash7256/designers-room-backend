import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';

// Precomputed dummy hash used to equalize timing when the user is not found.
const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuvuHGJfv4WdNriPaLRxM7V8GGH8JjR5OZe';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.usersRepository.create({
        email: dto.email,
        password: hashed,
        name: dto.name,
      });
      return this.generateToken(user.id, user.email);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);

    // Always run bcrypt to equalise timing (prevent user-enumeration via timing).
    const valid = await bcrypt.compare(
      dto.password,
      user?.password ?? DUMMY_HASH,
    );

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user.id, user.email);
  }

  private generateToken(userId: string, email: string) {
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`;
    return {
      access_token: this.jwtService.sign({ sub: userId, email }, { expiresIn }),
    };
  }
}
