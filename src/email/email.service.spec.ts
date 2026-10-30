import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService } from './email.service.js';

const { sendMock, resendConstructor } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  resendConstructor: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };

    constructor(...args: unknown[]) {
      resendConstructor(...args);
    }
  },
}));

function configWith(values: Record<string, string | undefined>): ConfigService {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

const configured = () =>
  configWith({
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM_EMAIL: 'Designers Room <hello@example.com>',
    RESEND_REPLY_TO: 'reply@example.com',
  });

const message = {
  to: 'user@example.com',
  subject: 'Welcome to Designers Room',
  html: '<p>Hello</p>',
  text: 'Hello',
};

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports whether Resend is configured', () => {
    expect(new EmailService(configured()).isConfigured()).toBe(true);
    expect(new EmailService(configWith({})).isConfigured()).toBe(false);
  });

  it('fails clearly when the service is not configured', async () => {
    const service = new EmailService(configWith({}));

    await expect(service.send(message)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends through Resend with the configured sender and idempotency key', async () => {
    sendMock.mockResolvedValue({
      data: { id: 'email_123' },
      error: null,
      headers: null,
    });

    const service = new EmailService(configured());
    const result = await service.send({
      ...message,
      idempotencyKey: 'key-123',
    });

    expect(resendConstructor).toHaveBeenCalledWith('re_test_key');
    expect(sendMock).toHaveBeenCalledWith(
      {
        from: 'Designers Room <hello@example.com>',
        replyTo: 'reply@example.com',
        to: 'user@example.com',
        subject: 'Welcome to Designers Room',
        html: '<p>Hello</p>',
        text: 'Hello',
      },
      {
        idempotencyKey: 'key-123',
        signal: expect.any(AbortSignal),
      },
    );
    expect(result).toEqual({ id: 'email_123' });
  });

  it('generates an idempotency key when the caller does not provide one', async () => {
    sendMock.mockResolvedValue({
      data: { id: 'email_123' },
      error: null,
      headers: null,
    });

    await new EmailService(configured()).send(message);

    const options = sendMock.mock.calls[0]?.[1] as { idempotencyKey?: string };
    expect(options.idempotencyKey).toEqual(expect.any(String));
    expect(options.idempotencyKey).not.toBe('');
  });

  it('retries a transient Resend failure once', async () => {
    sendMock
      .mockResolvedValueOnce({
        data: null,
        error: {
          name: 'internal_server_error',
          message: 'temporary failure',
          statusCode: 500,
        },
        headers: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'email_456' },
        error: null,
        headers: null,
      });

    const result = await new EmailService(configured()).send(message);

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ id: 'email_456' });
  });

  it('does not retry a non-retryable Resend failure', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: {
        name: 'validation_error',
        message: 'invalid from address',
        statusCode: 422,
      },
      headers: null,
    });

    await expect(
      new EmailService(configured()).send(message),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
