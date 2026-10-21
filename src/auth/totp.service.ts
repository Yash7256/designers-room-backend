import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { TOTP, generateSecret } from 'otplib';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class TotpService {
  private readonly key: Buffer;
  private readonly totp = new TOTP();
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly jwt: JwtService) {
    const raw = config.getOrThrow<string>('TOTP_ENCRYPTION_KEY');
    this.key = /^[\da-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : createHash('sha256').update(raw).digest();
  }
  encrypt(secret: string): string {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
  }
  decrypt(value: string): string {
    const data = Buffer.from(value, 'base64'); const decipher = createDecipheriv('aes-256-gcm', this.key, data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28)); return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
  }
  async enroll(userId: string) {
    const secret = generateSecret();
    await this.prisma.client.totpCredential.upsert({ where: { userId }, create: { userId, encryptedSecret: this.encrypt(secret) }, update: { encryptedSecret: this.encrypt(secret), verifiedAt: null } });
    await this.prisma.client.totpRecoveryCode.deleteMany({ where: { userId } });
    const codes = Array.from({ length: 10 }, () => randomBytes(8).toString('hex'));
    await this.prisma.client.totpRecoveryCode.createMany({ data: codes.map((code) => ({ userId, codeHash: createHash('sha256').update(code).digest('hex') })) });
    return { otpauthUrl: this.totp.toURI({ secret, label: userId, issuer: 'Designers Room' }), recoveryCodes: codes };
  }
  async verify(userId: string, code: string): Promise<boolean> {
    const credential = await this.prisma.client.totpCredential.findUnique({ where: { userId } });
    if (!credential || !(await this.totp.verify(code, { secret: this.decrypt(credential.encryptedSecret) })).valid) throw new UnauthorizedException('Invalid TOTP code');
    await this.prisma.client.totpCredential.update({ where: { userId }, data: { verifiedAt: new Date() } }); return true;
  }
  generateMfaToken(userId: string) { return this.jwt.sign({ sub: userId, purpose: 'mfa' }, { expiresIn: '5m' }); }
  validateMfaToken(token: string): string {
    try { const payload = this.jwt.verify<{ sub: string; purpose: string }>(token); if (payload.purpose !== 'mfa') throw new Error(); return payload.sub; }
    catch { throw new UnauthorizedException('Invalid MFA token'); }
  }
  async useRecoveryCode(userId: string, code: string): Promise<boolean> {
    const codeHash = createHash('sha256').update(code).digest('hex');
    const row = await this.prisma.client.totpRecoveryCode.findFirst({ where: { userId, codeHash, usedAt: null } });
    if (!row) throw new ForbiddenException('Recovery code is invalid or has been used');
    await this.prisma.client.totpRecoveryCode.update({ where: { id: row.id }, data: { usedAt: new Date() } }); return true;
  }
}
