import type { Response } from 'express';
import type { ErrorCodeValue } from '../errors/index.js';

/** One envelope for every response, success or failure. Clients parse one shape forever. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ErrorCodeValue;
    message: string;
    messageHi?: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  const body: ApiSuccess<T> = meta ? { success: true, data, meta } : { success: true, data };
  res.status(statusCode).json(body);
}

export function sendFailure(res: Response, statusCode: number, error: ApiFailure['error']): void {
  res.status(statusCode).json({ success: false, error } satisfies ApiFailure);
}
