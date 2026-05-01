import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt, randomUUID } from 'crypto';
import { Resend } from 'resend';

type ResetState = {
  codeHash: string;
  expiresAtMs: number;
  resendAvailableAtMs: number;
  attempts: number;
  resetTokenHash?: string;
  resetTokenExpiresAtMs?: number;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly resetStore = new Map<string, ResetState>();
  private readonly codeTtlMs = 10 * 60 * 1000;
  private readonly resendCooldownMs = 60 * 1000;
  private readonly resetTokenTtlMs = 15 * 60 * 1000;
  private readonly maxAttempts = 5;
  private readonly resendClient: Resend | null;
  private readonly resendFromEmail: string;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resendClient = apiKey ? new Resend(apiKey) : null;
    this.resendFromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ??
      'Mobility <onboarding@resend.dev>';
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; user_id: number; name: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('u')
      .where('LOWER(TRIM(u.email)) = :email', { email: normalizedEmail })
      .getOne();

    if (!user) throw new UnauthorizedException('Email ou senha inválidos');

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.password ?? '');
    } catch {
      passwordMatch = false;
    }
    if (!passwordMatch)
      throw new UnauthorizedException('Email ou senha inválidos');

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);
    return { access_token, user_id: user.id, name: user.name };
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private createNumericCode(): string {
    return String(randomInt(100000, 1000000));
  }

  private async sendResetCodeEmail(email: string, code: string): Promise<void> {
    if (!this.resendClient) {
      this.logger.warn(
        'RESEND_API_KEY não configurada; usando log local do código de reset.',
      );
      this.logger.log(`Reset code for ${email}: ${code}`);
      return;
    }

    await this.resendClient.emails.send({
      from: this.resendFromEmail,
      to: email,
      subject: 'Código para redefinir sua senha',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Recuperação de senha - Mobility</h2>
          <p>Use o código abaixo para confirmar sua identidade:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
          <p>Esse código expira em 10 minutos.</p>
        </div>
      `,
    });
  }

  /** Resposta genérica por segurança (sem revelar se o email existe). */
  async forgotPassword(email: string): Promise<{
    message: string;
    resend_after_seconds: number;
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    const now = Date.now();
    const existing = this.resetStore.get(normalizedEmail);
    if (existing && existing.resendAvailableAtMs > now) {
      return {
        message: 'Código enviado para o email',
        resend_after_seconds: Math.ceil((existing.resendAvailableAtMs - now) / 1000),
      };
    }

    const code = this.createNumericCode();
    this.resetStore.set(normalizedEmail, {
      codeHash: this.hashValue(code),
      expiresAtMs: now + this.codeTtlMs,
      resendAvailableAtMs: now + this.resendCooldownMs,
      attempts: 0,
    });

    const user = await this.usersRepository
      .createQueryBuilder('u')
      .where('LOWER(TRIM(u.email)) = :email', { email: normalizedEmail })
      .getOne();
    if (user) {
      try {
        await this.sendResetCodeEmail(normalizedEmail, code);
      } catch (error) {
        this.logger.error(
          `Falha ao enviar email de recuperação para ${normalizedEmail}: ${
            (error as Error).message
          }`,
        );
      }
    }

    return {
      message: 'Código enviado para o email',
      resend_after_seconds: Math.ceil(this.resendCooldownMs / 1000),
    };
  }

  async verifyResetCode(
    email: string,
    code: string,
  ): Promise<{ reset_token: string; expires_in_seconds: number }> {
    const normalizedEmail = email.trim().toLowerCase();
    const current = this.resetStore.get(normalizedEmail);
    if (!current) {
      throw new BadRequestException('Código inválido ou expirado');
    }
    const now = Date.now();
    if (now > current.expiresAtMs) {
      this.resetStore.delete(normalizedEmail);
      throw new BadRequestException('Código inválido ou expirado');
    }
    if (current.attempts >= this.maxAttempts) {
      this.resetStore.delete(normalizedEmail);
      throw new BadRequestException('Muitas tentativas. Solicite um novo código.');
    }

    if (this.hashValue(code.trim()) !== current.codeHash) {
      current.attempts += 1;
      this.resetStore.set(normalizedEmail, current);
      throw new BadRequestException('Código inválido ou expirado');
    }

    const resetToken = randomUUID();
    const nextState: ResetState = {
      ...current,
      resetTokenHash: this.hashValue(resetToken),
      resetTokenExpiresAtMs: now + this.resetTokenTtlMs,
      attempts: 0,
    };
    this.resetStore.set(normalizedEmail, nextState);

    return {
      reset_token: resetToken,
      expires_in_seconds: Math.ceil(this.resetTokenTtlMs / 1000),
    };
  }

  async resetPassword(
    email: string,
    resetToken: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('A nova senha deve ter no mínimo 6 caracteres');
    }
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const state = this.resetStore.get(normalizedEmail);
    if (!state || !state.resetTokenHash || !state.resetTokenExpiresAtMs) {
      throw new BadRequestException('Sessão de redefinição inválida. Solicite novo código.');
    }
    const now = Date.now();
    if (now > state.resetTokenExpiresAtMs) {
      this.resetStore.delete(normalizedEmail);
      throw new BadRequestException('Sessão de redefinição expirada. Solicite novo código.');
    }
    if (this.hashValue(resetToken.trim()) !== state.resetTokenHash) {
      throw new BadRequestException('Sessão de redefinição inválida. Solicite novo código.');
    }

    const user = await this.usersRepository
      .createQueryBuilder('u')
      .where('LOWER(TRIM(u.email)) = :email', { email: normalizedEmail })
      .getOne();
    if (!user) {
      throw new BadRequestException('Não foi possível redefinir a senha.');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);
    this.resetStore.delete(normalizedEmail);
    return { message: 'Senha redefinida com sucesso' };
  }
}
