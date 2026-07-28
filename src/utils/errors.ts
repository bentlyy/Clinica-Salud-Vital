import { ERROR_MESSAGES, type ErrorCode } from './error-codes.js';

export class AppError extends Error {
  statusCode: number;
  code?: ErrorCode;

  constructor(message: string, statusCode: number, code?: ErrorCode) {
    const resolved = code ? (ERROR_MESSAGES[code] ?? message) : message;
    super(resolved);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(messageOrCode: string | ErrorCode, customMessage?: string) {
    const isCode = typeof messageOrCode === 'string' && messageOrCode in ERROR_MESSAGES;
    super(
      customMessage ?? messageOrCode as string,
      400,
      isCode ? (messageOrCode as ErrorCode) : undefined,
    );
  }
}

export class NotFoundError extends AppError {
  constructor(messageOrCode: string | ErrorCode = 'Resource not found', customMessage?: string) {
    const isCode = typeof messageOrCode === 'string' && messageOrCode in ERROR_MESSAGES;
    super(
      customMessage ?? messageOrCode as string,
      404,
      isCode ? (messageOrCode as ErrorCode) : undefined,
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(messageOrCode: string | ErrorCode = 'Unauthorized', customMessage?: string) {
    const isCode = typeof messageOrCode === 'string' && messageOrCode in ERROR_MESSAGES;
    super(
      customMessage ?? messageOrCode as string,
      401,
      isCode ? (messageOrCode as ErrorCode) : undefined,
    );
  }
}

export class ForbiddenError extends AppError {
  constructor(messageOrCode: string | ErrorCode = 'Forbidden', customMessage?: string) {
    const isCode = typeof messageOrCode === 'string' && messageOrCode in ERROR_MESSAGES;
    super(
      customMessage ?? messageOrCode as string,
      403,
      isCode ? (messageOrCode as ErrorCode) : undefined,
    );
  }
}

/**
 * Safely convert an unknown caught value to an Error instance.
 * Handles: Error, string, object with message, null/undefined.
 */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error(String((err as { message: unknown }).message));
  }
  return new Error('Unknown error');
}
