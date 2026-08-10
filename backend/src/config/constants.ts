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
  COMMUNITIES: 'communities',
  AUDIT_LOGS: 'audit_logs',
});

/**
 * Join-code alphabet.
 *
 * Built by elimination, because this code gets read off a photographed poster and
 * dictated over a phone call:
 *   - no vowels, so a code can never accidentally spell a word;
 *   - of each lookalike group only one survives — `0/O/Q`, `1/I/L`, `2/Z`, `5/S`,
 *     `6/G`, `7/T`, `8/B`, `U/V`.
 * What is left is 22 characters that cannot be confused with one another.
 */
export const JOIN_CODE_ALPHABET = '23456789CDFHJKMNPRVWXY';

/** 22^8 ≈ 5.5e10 codes — collisions are a non-event, and it fits on one line. */
export const JOIN_CODE_LENGTH = 8;

/** Codes are shown grouped for readability: `K7M2-QX9B`. Storage stays ungrouped. */
export const JOIN_CODE_GROUP_SIZE = 4;

/**
 * Attempts to find an unused code before giving up. With this alphabet the first
 * attempt effectively always wins; the retry exists only so a genuine unique-index
 * collision surfaces as a clean 409 rather than a 500.
 */
export const JOIN_CODE_MAX_ATTEMPTS = 5;

/** A leader may hold exactly one community. Admins and super admins are unbounded. */
export const MAX_COMMUNITIES_PER_LEADER = 1;
