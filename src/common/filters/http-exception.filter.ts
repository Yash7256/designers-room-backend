import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
}

function isPrismaError(err: unknown): err is PrismaKnownError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as Record<string, unknown>).code === 'string'
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config?: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // ── Prisma known errors ─────────────────────────────────────────────────
    if (isPrismaError(exception)) {
      if (exception.code === 'P2002') {
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
        });
        return;
      }
      if (exception.code === 'P2025') {
        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
        });
        return;
      }
      // Other Prisma errors — log but don't leak details
      const isProduction = this.config?.get<string>('NODE_ENV') === 'production';
      this.logger.error(`Prisma error ${exception.code}${exception.meta ? ` ${JSON.stringify(exception.meta)}` : ''}`);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: isProduction ? 'Internal server error' : `Database error (${exception.code})`,
        ...(!isProduction ? { code: exception.code, meta: exception.meta } : {}),
      });
      return;
    }

    // ── NestJS HTTP exceptions ───────────────────────────────────────────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500 && this.config?.get<string>('NODE_ENV') === 'production') {
        this.logger.error('Server error', exception as never);
        response.status(status).json({
          statusCode: status,
          message: 'Internal server error',
        });
        return;
      }
      const exceptionResponse = exception.getResponse();
      const body =
        typeof exceptionResponse === 'string'
          ? { statusCode: status, message: exceptionResponse }
          : { statusCode: status, ...exceptionResponse as object };
      response.status(status).json(body);
      return;
    }

    // ── Unknown errors ───────────────────────────────────────────────────────
    this.logger.error('Unhandled exception', exception as never);
    const isProduction = this.config?.get<string>('NODE_ENV') === 'production';
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProduction ? 'Internal server error' : exception instanceof Error ? exception.message : 'Internal server error',
      ...(!isProduction && exception instanceof Error ? { stack: exception.stack } : {}),
    });
  }
}
