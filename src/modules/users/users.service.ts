import { AppError, ErrorCode } from '../../core/errors/index.js';
import {
  canAssignRole,
  hashPassword,
  outranks,
  type Principal,
  type Role,
} from '../../core/security/index.js';
import { paginate, type Paginated } from '../../shared/types.js';
import { toUserDto } from './users.mapper.js';
import type { UserDocument } from './users.model.js';
import { usersRepository } from './users.repository.js';
import type {
  CreateStaffUserInput,
  ListUsersFilter,
  UpdateProfileInput,
  UserDto,
  UserStatus,
} from './users.types.js';

async function getDocumentOrThrow(id: string): Promise<UserDocument> {
  const user = await usersRepository.findById(id);
  if (!user || user.status === 'DELETED') {
    throw AppError.notFound('User not found', { messageHi: 'उपयोगकर्ता नहीं मिला।' });
  }
  return user;
}

/**
 * Guards a privileged write against a *target*. Two separate rules, both required:
 * you may not act on yourself through the admin routes (use `/users/me`), and you
 * may only act on someone strictly below your own rank — otherwise one ADMIN could
 * suspend or demote another.
 */
function assertMayActOn(actor: Principal, target: UserDocument): void {
  if (actor.userId === target._id.toString()) {
    throw AppError.forbidden('Use the /users/me routes to change your own account', {
      messageHi: 'अपना खाता बदलने के लिए अपनी प्रोफ़ाइल का उपयोग करें।',
    });
  }
  if (!outranks(actor.role, target.role)) {
    throw AppError.forbidden('You cannot modify a user at or above your own level', {
      messageHi: 'आप अपने स्तर या उससे ऊपर के उपयोगकर्ता को नहीं बदल सकते।',
    });
  }
}

export const usersService = {
  /** Used by the authenticate middleware on every request; must stay cheap. */
  findById(id: string): Promise<UserDocument | null> {
    return usersRepository.findById(id);
  },

  findByPhone(phone: string): Promise<UserDocument | null> {
    return usersRepository.findByPhone(phone);
  },

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return usersRepository.findByEmailWithPassword(email);
  },

  /** Called by the OTP flow when a phone signs in for the first time. */
  createOtpUser(phone: string): Promise<UserDocument> {
    return usersRepository.createOtpUser({ phone });
  },

  touchLastLogin(id: string): Promise<void> {
    return usersRepository.touchLastLogin(id);
  },

  async getById(id: string): Promise<UserDto> {
    return toUserDto(await getDocumentOrThrow(id));
  },

  // ── Community membership ───────────────────────────────────────────────────
  //
  // Exposed on the service (rather than letting the communities module reach into
  // `usersRepository`) so the `users` collection keeps exactly one owner. The
  // communities service composes these with its own writes.

  /** `null` when the user is already a member of some community. */
  attachToCommunity(userId: string, communityId: string): Promise<UserDocument | null> {
    return usersRepository.attachToCommunity(userId, communityId);
  },

  /** `null` when the user was not a member of that community. */
  detachFromCommunity(userId: string, communityId: string): Promise<UserDocument | null> {
    return usersRepository.detachFromCommunity(userId, communityId);
  },

  detachAllFromCommunity(communityId: string): Promise<number> {
    return usersRepository.detachAllFromCommunity(communityId);
  },

  countByCommunity(communityId: string): Promise<number> {
    return usersRepository.countByCommunity(communityId);
  },

  async updateProfile(id: string, patch: UpdateProfileInput): Promise<UserDto> {
    await getDocumentOrThrow(id);
    const updated = await usersRepository.updateProfile(id, patch);
    if (!updated) throw AppError.notFound('User not found');
    return toUserDto(updated);
  },

  async list(filter: ListUsersFilter): Promise<Paginated<UserDto>> {
    const { items, total } = await usersRepository.list(filter);
    return paginate(items.map(toUserDto), total, filter.page, filter.pageSize);
  },

  /**
   * Staff creation. The actor may only mint roles strictly below their own, which
   * is what stops an ADMIN from creating a SUPER_ADMIN and then logging in as it.
   */
  async createStaffUser(
    actor: Principal,
    input: Omit<CreateStaffUserInput, 'passwordHash'> & { password: string },
  ): Promise<UserDto> {
    if (!canAssignRole(actor.role, input.role)) {
      throw new AppError(
        403,
        ErrorCode.ROLE_ESCALATION_DENIED,
        'You cannot create a user at or above your own level',
        { messageHi: 'आप अपने स्तर या उससे ऊपर का उपयोगकर्ता नहीं बना सकते।' },
      );
    }

    if (await usersRepository.existsByEmail(input.email)) {
      throw AppError.conflict('An account with this email already exists', {
        messageHi: 'इस ईमेल से खाता पहले से मौजूद है।',
      });
    }

    const created = await usersRepository.createStaffUser({
      email: input.email,
      passwordHash: await hashPassword(input.password),
      fullName: input.fullName,
      role: input.role,
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.preferredLanguage ? { preferredLanguage: input.preferredLanguage } : {}),
    });

    return toUserDto(created);
  },

  async assignRole(actor: Principal, targetId: string, role: Role): Promise<UserDto> {
    const target = await getDocumentOrThrow(targetId);
    assertMayActOn(actor, target);

    if (!canAssignRole(actor.role, role)) {
      throw new AppError(
        403,
        ErrorCode.ROLE_ESCALATION_DENIED,
        'You cannot grant a role at or above your own level',
        { messageHi: 'आप अपने स्तर या उससे ऊपर की भूमिका नहीं दे सकते।' },
      );
    }

    const updated = await usersRepository.updateRole(targetId, role);
    if (!updated) throw AppError.notFound('User not found');
    return toUserDto(updated);
  },

  async setStatus(actor: Principal, targetId: string, status: UserStatus): Promise<UserDto> {
    const target = await getDocumentOrThrow(targetId);
    assertMayActOn(actor, target);

    const updated = await usersRepository.updateStatus(targetId, status);
    if (!updated) throw AppError.notFound('User not found');
    return toUserDto(updated);
  },

  /**
   * Erases the PII and leaves a tombstone. Callers are expected to revoke the
   * user's sessions as well — see `usersController.remove`.
   */
  async remove(actor: Principal, targetId: string): Promise<UserDto> {
    const target = await getDocumentOrThrow(targetId);
    assertMayActOn(actor, target);

    const deleted = await usersRepository.softDelete(targetId);
    if (!deleted) throw AppError.notFound('User not found');
    return toUserDto(deleted);
  },
};
