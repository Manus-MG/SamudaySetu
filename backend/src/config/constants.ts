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
  COMMUNITY_INVITES: 'community_invites',
  AUDIT_LOGS: 'audit_logs',
});

/** How long a phone invite link stays valid. Long enough to survive a weekend. */
export const INVITE_TTL_DAYS = 14;

/** Per-community cap on invites sent per hour. Every SMS costs real money. */
export const INVITE_MAX_PER_COMMUNITY_PER_HOUR = 60;

/**
 * Join-code bounds, applied to the normalised form (letters and digits only).
 *
 * The floor is 4 so a code cannot be guessed in a handful of tries; the ceiling
 * is 24 because past that nobody reads it out correctly, and it stops fitting on
 * a poster in type large enough to matter.
 */
export const JOIN_CODE_MIN_LENGTH = 4;
export const JOIN_CODE_MAX_LENGTH = 24;

/**
 * Codes a community may not claim.
 *
 * Two reasons, both practical: these words appear in the join URL path, so one of
 * them as a code invites confusion with a real route; and a community holding
 * `SUPPORT` or `ADMIN` can impersonate the platform to its own members.
 */
export const JOIN_CODE_RESERVED: readonly string[] = Object.freeze([
  'ADMIN',
  'ADMINISTRATOR',
  'API',
  'APP',
  'AUTH',
  'COMMUNITY',
  'HELP',
  'HOME',
  'INVITE',
  'JOIN',
  'LOGIN',
  'LOGOUT',
  'NULL',
  'OTP',
  'ROOT',
  'SAMUDAY',
  'SAMUDAYSETU',
  'SETTINGS',
  'SIGNIN',
  'SIGNUP',
  'SUPERADMIN',
  'SUPPORT',
  'SYSTEM',
  'TEST',
  'UNDEFINED',
  'USER',
]);

/**
 * Attempts to find an unused generated code before giving up. The word-pair space
 * is ~40,000, so a collision is possible in a way it never was with random
 * characters — this is a real retry, not a formality.
 */
export const JOIN_CODE_MAX_ATTEMPTS = 8;

/** A leader may hold exactly one community. Admins and super admins are unbounded. */
export const MAX_COMMUNITIES_PER_LEADER = 1;
