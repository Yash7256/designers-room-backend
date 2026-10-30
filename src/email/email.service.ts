import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend, type CreateEmailOptions } from 'resend';
import type { SendEmailInput, SendEmailResult } from './email.types.js';

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 300;
const REQUEST_TIMEOUT_MS = 10_000;

interface ResendTransport {
  client: Resend;
  from: string;
  replyTo?: string;
}

function statusCodeOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === 'number' ? statusCode : undefined;
}

function isRetryable(error: unknown): boolean {
  const statusCode = statusCodeOf(error);
  return (
    statusCode === undefined ||
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode >= 500
  );
}

function describeError(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return 'unknown error';
  }
  const candidate = error as {
    name?: unknown;
    message?: unknown;
    statusCode?: unknown;
  };
  return [candidate.name, candidate.statusCode, candidate.message]
    .filter((value) => value !== undefined && value !== '')
    .join(' ');
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: Resend | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('RESEND_API_KEY')?.trim() &&
      this.config.get<string>('RESEND_FROM_EMAIL')?.trim(),
    );
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const transport = this.getTransport();
    const idempotencyKey = input.idempotencyKey ?? randomUUID();
    const replyTo = input.replyTo ?? transport.replyTo;

    const payload = {
      from: transport.from,
      to: input.to,
      subject: input.subject,
      ...(input.html !== undefined ? { html: input.html } : {}),
      ...(input.text !== undefined ? { text: input.text } : {}),
      ...(replyTo !== undefined ? { replyTo } : {}),
      ...(input.cc !== undefined ? { cc: input.cc } : {}),
      ...(input.bcc !== undefined ? { bcc: input.bcc } : {}),
    } as CreateEmailOptions;

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const { data, error } = await transport.client.emails.send(payload, {
          idempotencyKey,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!error) {
          return { id: data.id };
        }

        lastError = error;
        if (attempt < MAX_ATTEMPTS && isRetryable(error)) {
          await wait(RETRY_DELAY_MS);
          continue;
        }
        break;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_ATTEMPTS && isRetryable(error)) {
          await wait(RETRY_DELAY_MS);
          continue;
        }
        break;
      }
    }

    this.logger.error(
      `Resend failed to send "${input.subject}": ${describeError(lastError)}`,
    );
    throw new BadGatewayException('Failed to send email');
  }

  private getTransport(): ResendTransport {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const from = this.config.get<string>('RESEND_FROM_EMAIL')?.trim();

    if (!apiKey || !from) {
      throw new ServiceUnavailableException('Email delivery is not configured');
    }

    if (!this.client) {
      this.client = new Resend(apiKey);
    }

    const replyTo = this.config.get<string>('RESEND_REPLY_TO')?.trim();

    return {
      client: this.client,
      from,
      ...(replyTo ? { replyTo } : {}),
    };
  }
}
