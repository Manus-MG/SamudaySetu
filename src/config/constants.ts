/** Correlation id echoed back on every response and attached to every log line. */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Mounted prefix for every versioned API route. */
export const API_PREFIX = '/api/v1';

/** Max accepted JSON / urlencoded body size. */
export const BODY_LIMIT = '1mb';

/** Baseline API rate limit applied to every route. */
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 120;

/**
 * Login and OTP endpoints are attacked far more than the rest of the API, and every
 * SMS costs real money — they get their own much stricter limiter on top of the
 * per-phone quota enforced in the OTP service.
 */
export const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

/** How long the process waits for in-flight requests before forcing exit. */
export const SHUTDOWN_TIMEOUT_MS = 10_000;

/** OTP is 6 digits: what every Indian app this demographic already uses looks like. */
export const OTP_LENGTH = 6;

/** Client-side resend cooldown; the mobile app mirrors this value. */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

/** After max failed verifies the phone is locked for this long. */
export const OTP_LOCKOUT_MINUTES = 30;

/** Collection names, declared once so indexes and lookups cannot drift. */
export const COLLECTIONS = Object.freeze({
  USERS: 'users',
  OTP_CHALLENGES: 'otp_challenges',
  REFRESH_TOKENS: 'refresh_tokens',
});
