import { Router } from 'express';
import { AUTH_RATE_LIMIT_MAX_REQUESTS, AUTH_RATE_LIMIT_WINDOW_MS } from '../../config/index.js';
import { createRateLimiter, validate } from '../../core/middleware/index.js';
import { authController } from './auth.controller.js';
import { authenticate } from './auth.middleware.js';
import {
  logoutSchema,
  passwordLoginSchema,
  refreshSchema,
  requestOtpSchema,
  sessionIdParamSchema,
  verifyOtpSchema,
} from './auth.schema.js';

/**
 * Unauthenticated auth endpoints are the most attacked surface in the API, so they
 * sit behind a limiter far tighter than the global one. This is per-IP; the
 * per-phone SMS quota is enforced separately in the OTP service.
 */
const authLimiter = createRateLimiter({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many attempts. Please wait a minute and try again.',
});

/** Mounted at `/api/v1/auth`. */
export const authRoutes: Router = Router();

// ── Public ───────────────────────────────────────────────────────────────────
// One entry point for members: enter phone → OTP → home or onboarding.
authRoutes.post('/otp/request', authLimiter, validate({ body: requestOtpSchema }), authController.requestOtp);
authRoutes.post('/otp/verify', authLimiter, validate({ body: verifyOtpSchema }), authController.verifyOtp);

// Staff only (SUPER_ADMIN / ADMIN) — enforced in the service, not by the route.
authRoutes.post('/login', authLimiter, validate({ body: passwordLoginSchema }), authController.login);

authRoutes.post('/refresh', authLimiter, validate({ body: refreshSchema }), authController.refresh);
authRoutes.post('/logout', validate({ body: logoutSchema }), authController.logout);

// ── Authenticated ────────────────────────────────────────────────────────────
authRoutes.use(authenticate);

authRoutes.post('/logout-all', authController.logoutEverywhere);
authRoutes.get('/sessions', authController.listSessions);
authRoutes.delete('/sessions/:id', validate({ params: sessionIdParamSchema }), authController.revokeSession);
