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
  communityId: string | null;
  joinedCommunityAt: string | null;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Communities (backend/src/modules/communities/communities.types.ts) ───────

export const COMMUNITY_STATUSES = [
  'PENDING_APPROVAL',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
  'ARCHIVED',
] as const;
export type CommunityStatus = (typeof COMMUNITY_STATUSES)[number];

export const COMMUNITY_STATUS_LABELS: Readonly<Record<CommunityStatus, string>> = Object.freeze({
  PENDING_APPROVAL: 'Pending approval',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  ARCHIVED: 'Archived',
});

export const COMMUNITY_TYPES = [
  'SAMAJ',
  'POLITICAL',
  'RWA',
  'ALUMNI',
  'NGO',
  'TRADE_BODY',
  'OTHER',
] as const;
export type CommunityType = (typeof COMMUNITY_TYPES)[number];

export const COMMUNITY_TYPE_LABELS: Readonly<Record<CommunityType, string>> = Object.freeze({
  SAMAJ: 'Samaj / caste community',
  POLITICAL: 'Political organisation',
  RWA: 'Resident welfare association',
  ALUMNI: 'Alumni network',
  NGO: 'NGO / trust',
  TRADE_BODY: 'Trade body / union',
  OTHER: 'Other',
});

/** Mirrors the server's transition table; the server rejects anything else. */
export const MODERATION_ACTIONS = ['APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/**
 * Which moderation actions are legal from a given status. Duplicated client-side
 * only so the UI can hide buttons that would 409 — the server is the authority.
 */
export const ALLOWED_MODERATION: Readonly<Record<CommunityStatus, readonly ModerationAction[]>> =
  Object.freeze({
    PENDING_APPROVAL: ['APPROVE', 'REJECT'],
    ACTIVE: ['SUSPEND'],
    SUSPENDED: ['REACTIVATE'],
    REJECTED: [],
    ARCHIVED: [],
  });

export interface CommunityLocation {
  state: string | null;
  district: string | null;
  city: string | null;
  pincode: string | null;
}

export interface CommunityDto {
  id: string;
  name: string;
  description: string | null;
  type: CommunityType;
  status: CommunityStatus;
  joinCode: string;
  joinCodeFormatted: string;
  joinCodeUpdatedAt: string;
  leaderId: string | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  memberCount: number;
  isJoinable: boolean;
  isAcceptingMembers: boolean;
  location: CommunityLocation;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Everything needed to get a member through the door, in one response. */
export interface JoinKitDto {
  communityId: string;
  communityName: string;
  joinCode: string;
  joinCodeFormatted: string;
  joinUrl: string;
  deepLink: string;
  /** SVG data URL, ready for `<img src>`. */
  qrDataUrl: string;
  shareMessage: string;
}

// ── Audit (backend/src/modules/audit/audit.types.ts) ─────────────────────────

export const AUDIT_ACTIONS = [
  'COMMUNITY_CREATED',
  'COMMUNITY_UPDATED',
  'COMMUNITY_APPROVED',
  'COMMUNITY_REJECTED',
  'COMMUNITY_SUSPENDED',
  'COMMUNITY_REACTIVATED',
  'COMMUNITY_ARCHIVED',
  'COMMUNITY_LEADER_ASSIGNED',
  'COMMUNITY_LEADER_REMOVED',
  'COMMUNITY_JOIN_CODE_ROTATED',
  'COMMUNITY_JOINING_OPENED',
  'COMMUNITY_JOINING_CLOSED',
  'COMMUNITY_MEMBER_JOINED',
  'COMMUNITY_MEMBER_LEFT',
  'USER_CREATED',
  'USER_ROLE_ASSIGNED',
  'USER_STATUS_CHANGED',
  'USER_DELETED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_RESOURCE_TYPES = ['COMMUNITY', 'USER'] as const;
export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[number];

export interface AuditLogDto {
  id: string;
  actorId: string;
  actorRole: Role;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  communityId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  requestId: string | null;
  createdAt: string;
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

export interface ListCommunitiesParams {
  status?: CommunityStatus;
  type?: CommunityType;
  leaderId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCommunityPayload {
  name: string;
  type: CommunityType;
  description?: string;
  leaderId?: string;
  location?: { state?: string; district?: string; city?: string; pincode?: string };
  contactEmail?: string;
  contactPhone?: string;
}

/**
 * `null` and absent mean different things: `null` clears the field, absent leaves
 * it alone. Mirrors the server's `updateCommunitySchema`.
 */
export interface UpdateCommunityPayload {
  name?: string;
  description?: string | null;
  type?: CommunityType;
  location?: { state?: string; district?: string; city?: string; pincode?: string };
  contactEmail?: string | null;
  contactPhone?: string | null;
  isJoinable?: boolean;
}

export interface ListMembersParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListAuditParams {
  action?: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  actorId?: string;
  communityId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
