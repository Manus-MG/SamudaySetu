import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from '../../config/index.js';
import { AppError } from '../errors/index.js';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Rate limiters route their rejection through the normal error pipeline so that
 * clients get the same `{ success, error }` envelope everywhere.
 *
 * Uses the in-process memory store: correct for a single instance. When the API is
 * scaled horizontally this must be swapped for a shared store, otherwise the
 * effective limit is `max × instanceCount`.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        AppError.rateLimited(options.message ?? 'Too many requests. Please try again later.', {
          messageHi: 'बहुत अधिक अनुरोध। कृपया कुछ देर बाद प्रयास करें।',
        }),
      );
    },
  });
}

export const globalRateLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
});
