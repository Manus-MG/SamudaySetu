import type { Role } from '../../core/security/index.js';
import type { Gender, SupportedLanguage } from '../../shared/types.js';

/**
 * Lifecycle of an account.
 *
 * `PENDING_PROFILE` exists because OTP verification creates the account before the
 * user has given a name — the app routes them to onboarding rather than home.
 * `DELETED` is a tombstone: the PII is erased (DPDP), the row is kept so audit
 * trails and foreign keys stay intact.
 */
export const USER_STATUSES = ['PENDING_PROFILE', 'ACTIVE', 'SUSPENDED', 'DELETED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Statuses that may hold a session. Anything else is refused at authentication. */
export const ACTIVE_USER_STATUSES: readonly UserStatus[] = ['PENDING_PROFILE', 'ACTIVE'];

/** The user as the API exposes it. Never contains `passwordHash`. */
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
  /** The community this account is a member of, or `null`. */
  communityId: string | null;
  joinedCommunityAt: string | null;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOtpUserInput {
  phone: string;
  preferredLanguage?: SupportedLanguage;
}

export interface CreateStaffUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  phone?: string;
  preferredLanguage?: SupportedLanguage;
}

export interface UpdateProfileInput {
  fullName?: string;
  gender?: Gender;
  preferredLanguage?: SupportedLanguage;
}

export interface ListUsersFilter {
  role?: Role;
  status?: UserStatus;
  /** Matches against name, phone or email. */
  search?: string;
  /** Restricts the result to members of one community. */
  communityId?: string;
  page: number;
  pageSize: number;
}
