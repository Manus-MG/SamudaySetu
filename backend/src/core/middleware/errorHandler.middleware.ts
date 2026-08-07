import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { isProduction } from '../../config/index.js';
import { getContext } from '../context/index.js';
import { AppError, ErrorCode, isAppError } from '../errors/index.js';
import { sendFailure } from '../http/index.js';
import { logger } from '../logger/index.js';

function normalise(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof ZodError) {
    return AppError.badRequest('Request validation failed', {
      messageHi: 'दी गई जानकारी सही नहीं है।',
      details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      cause: error,
    });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return AppError.badRequest('Document validation failed', { cause: error });
  }

  if (error instanceof mongoose.Error.CastError) {
    return AppError.badRequest(`Invalid value for '${error.path}'`, { cause: error });
  }

  if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
    return AppError.conflict('A record with these details already exists', { cause: error });
  }

  return AppError.internal('Something went wrong', { cause: error });
}

/** Terminal error middleware. Must be registered last, and must take 4 arguments. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) return next(error);

  const appError = normalise(error);
  const requestId = getContext()?.requestId;

  const logPayload = { err: error, requestId, code: appError.code };
  if (appError.statusCode >= 500) logger.error(logPayload, appError.message);
  else logger.warn(logPayload, appError.message);

  const exposeMessage = appError.statusCode < 500 || !isProduction;

  sendFailure(res, appError.statusCode, {
    code: appError.code,
    message: exposeMessage ? appError.message : 'Something went wrong',
    ...(appError.messageHi ? { messageHi: appError.messageHi } : {}),
    ...(appError.details !== undefined && appError.code !== ErrorCode.INTERNAL
      ? { details: appError.details }
      : {}),
  });
}
