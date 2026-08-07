import { ErrorCode, type ErrorCodeValue } from './errorCodes.js';

export interface AppErrorOptions {
  /** Hindi message shown to the user; Hindi is the default locale of the app. */
  messageHi?: string;
  details?: unknown;
  cause?: unknown;
}

/**
 * The only error type controllers and services should throw. Anything else that
 * reaches the error handler is treated as an unexpected 500 and logged as such.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCodeValue;
  readonly messageHi: string | undefined;
  readonly details: unknown;
  readonly isOperational = true;

  constructor(
    statusCode: number,
    code: ErrorCodeValue,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.messageHi = options.messageHi;
    this.details = options.details;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message: string, options?: AppErrorOptions): AppError {
    return new AppError(400, ErrorCode.VALIDATION_FAILED, message, options);
  }

  static unauthenticated(message = 'Authentication required', options?: AppErrorOptions): AppError {
    return new AppError(401, ErrorCode.UNAUTHENTICATED, message, options);
  }

  static forbidden(message = 'You do not have access to this resource', options?: AppErrorOptions): AppError {
    return new AppError(403, ErrorCode.FORBIDDEN, message, options);
  }

  static notFound(message = 'Resource not found', options?: AppErrorOptions): AppError {
    return new AppError(404, ErrorCode.NOT_FOUND, message, options);
  }

  static conflict(message: string, options?: AppErrorOptions): AppError {
    return new AppError(409, ErrorCode.CONFLICT, message, options);
  }

  static rateLimited(message = 'Too many requests', options?: AppErrorOptions): AppError {
    return new AppError(429, ErrorCode.RATE_LIMITED, message, options);
  }

  static internal(message = 'Something went wrong', options?: AppErrorOptions): AppError {
    return new AppError(500, ErrorCode.INTERNAL, message, options);
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
