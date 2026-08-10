import type { Role } from '../../core/security/index.js';

/**
 * Every auditable verb in the system, as past-tense facts.
 *
 * Kept as one flat closed set rather than a free-text string so the list can be
 * filtered, alerted on and translated. Adding an action is a deliberate act:
 * if it is not in this union it does not get written.
 */
export const AUDIT_ACTIONS = [
  // Communities
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

  // Accounts
  'USER_CREATED',
  'USER_ROLE_ASSIGNED',
  'USER_STATUS_CHANGED',
  'USER_DELETED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_RESOURCE_TYPES = ['COMMUNITY', 'USER'] as const;
export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[number];

/**
 * What a caller supplies. The recorder fills in the request id and timestamp, so
 * no call site can forget them or get them wrong.
 */
export interface RecordAuditInput {
  actorId: string;
  actorRole: Role;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  /** Set whenever the event belongs to a community, including for USER events. */
  communityId?: string | null;
  /**
   * One human-readable line, written at the call site where the context is known.
   * It must never contain PII beyond a name already visible to the reader, and
   * never a secret — join codes are referenced by event, not by value.
   */
  summary: string;
  /** Structured before/after detail. Same PII rule as `summary`. */
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

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

export interface ListAuditFilter {
  action?: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  actorId?: string;
  communityId?: string;
  /** Inclusive lower bound on `createdAt`. */
  from?: Date;
  /** Exclusive upper bound on `createdAt`. */
  to?: Date;
  page: number;
  pageSize: number;
}
