import type { UserDocument } from './users.model.js';
import type { UserDto } from './users.types.js';

const toIso = (value: Date | null | undefined): string | null => value?.toISOString() ?? null;

/**
 * The single place a user document becomes an API response. Anything not listed
 * here — `passwordHash` above all — cannot leak, because the DTO is built by
 * enumeration rather than by spreading the document.
 */
export function toUserDto(doc: UserDocument): UserDto {
  return {
    id: doc._id.toString(),
    phone: doc.phone,
    email: doc.email,
    fullName: doc.fullName,
    gender: doc.gender,
    preferredLanguage: doc.preferredLanguage,
    role: doc.role,
    status: doc.status,
    isProfileComplete: doc.status !== 'PENDING_PROFILE' && Boolean(doc.fullName),
    phoneVerifiedAt: toIso(doc.phoneVerifiedAt),
    lastLoginAt: toIso(doc.lastLoginAt),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
