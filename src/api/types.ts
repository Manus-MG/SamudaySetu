/**
 * Wire types. These mirror the backend DTOs one-for-one — see
 * `backend/src/modules/*.types.ts` and `backend/src/shared/types.ts`.
 *
 * They are hand-maintained rather than generated, so the rule is: nothing in this
 * file may describe a field the API does not actually return. A shape invented
 * here becomes `undefined` at runtime and the failure surfaces far from the cause.
 */

// ── Roles & permissions (backend/src/core/security/roles.ts) ─────────────────

export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'LEADER', 'USER'] as const;
export type Role = (typeof ROLES)[number];

/** Lower number = more authority. Mirrors `ROLE_RANK` on the server. */
export const ROLE_RANK: Readonly<Record<Role, number>> = Object.freeze({
  SUPER_ADMIN: 0,
  ADMIN: 1,
  LEADER: 2,
  USER: 3,
});

/** Roles that can sign in to this console at all (email + password). */
export const STAFF_ROLES: readonly Role[] = Object.freeze(['SUPER_ADMIN', 'ADMIN']);

export const isStaffRole = (role: Role): boolean => STAFF_ROLES.includes(role);

/**
 * Mirrors `canAssignRole` on the server: an actor may only grant roles strictly
 * below their own. Duplicated client-side purely so the UI can grey out options —
 * the server enforces it regardless of what the browser sends.
 */
export const canAssignRole = (actorRole: Role, targetRole: Role): boolean =>
  ROLE_RANK[actorRole] < ROLE_RANK[targetRole];

/** Whether `actorRole` may act on a user holding `targetRole`. Peers cannot. */
export const outranks = (actorRole: Role, targetRole: Role): boolean =>
  ROLE_RANK[actorRole] < ROLE_RANK[targetRole];

export const ROLE_LABELS: Readonly<Record<Role, string>> = Object.freeze({
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  LEADER: 'Leader',
  USER: 'Member',
});

export const ROLE_DESCRIPTIONS: Readonly<Record<Role, string>> = Object.freeze({
  SUPER_ADMIN: 'Full platform control. Created only by the server-side bootstrap script.',
  ADMIN: 'Platform operations: manage staff, roles and account status.',
  LEADER: 'Read-only access to the member directory.',
  USER: 'Ordinary member. Signs in on the mobile app with OTP; cannot access this console.',
});

// ── User lifecycle (backend/src/modules/users/users.types.ts) ─────────────────

export const USER_STATUSES = ['PENDING_PROFILE', 'ACTIVE', 'SUSPENDED', 'DELETED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** The only two the console may set directly; `DELETED` goes through DELETE. */
export const SETTABLE_USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
export type SettableUserStatus = (typeof SETTABLE_USER_STATUSES)[number];

export const STATUS_LABELS: Readonly<Record<UserStatus, string>> = Object.freeze({
  PENDING_PROFILE: 'Pending profile',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  DELETED: 'Deleted',
});

export type SupportedLanguage = 'hi' | 'en' | 'bho' | 'mai' | 'ur';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface UserDto {
  id: string;
  phone: string | null;
  email: string | null;
  fullName: string | null;
  gender: Gender | null;
  preferredLanguage: SupportedLanguage;
  role: Role;
  status: UserStatus;
  isProfileComplete: boolean;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Auth (backend/src/modules/auth/auth.types.ts) ────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResult extends TokenPair {
  user: UserDto;
  isNewUser: boolean;
}

export interface SessionDto {
  id: string;
  deviceId: string;
  deviceName: string | null;
  platform: string | null;
  ip: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

// ── Health (backend/src/modules/health/health.types.ts) ───────────────────────

export type DependencyState = 'up' | 'down';

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  dependencies: {
    mongo: { state: DependencyState; detail: string };
  };
}

export interface StatusReport extends ReadinessReport {
  service: string;
  version: string;
  environment: 'development' | 'test' | 'production';
  uptimeSeconds: number;
  timestamp: string;
}

// ── Pagination (backend/src/shared/types.ts) ─────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Request payloads ─────────────────────────────────────────────────────────

export interface ListUsersParams {
  role?: Role;
  status?: UserStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateStaffUserPayload {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  phone?: string;
  preferredLanguage?: SupportedLanguage;
}
