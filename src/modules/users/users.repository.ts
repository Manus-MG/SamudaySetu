import type { FilterQuery, UpdateQuery } from 'mongoose';
import type { Role } from '../../core/security/index.js';
import { UserModel, type UserDocument } from './users.model.js';
import type {
  CreateOtpUserInput,
  CreateStaffUserInput,
  ListUsersFilter,
  UpdateProfileInput,
  UserStatus,
} from './users.types.js';

/**
 * The only place the `users` collection is touched. Every method returns a lean
 * plain object, never a Mongoose document, so business logic upstream cannot
 * accidentally call `.save()` and bypass the service layer.
 */
type LeanUser = UserDocument | null;

const lean = { lean: true as const };

/** Escapes a user-supplied search term so it cannot inject regex metacharacters. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildListQuery(filter: ListUsersFilter): FilterQuery<UserDocument> {
  const query: FilterQuery<UserDocument> = {};

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.role) {
    query.role = filter.role;
  }

  if (filter.search) {
    const term = new RegExp(escapeRegex(filter.search), 'i');
    query.$or = [{ fullName: term }, { phone: term }, { email: term }];
  }

  return query;
}

export const usersRepository = {
  findById(id: string): Promise<LeanUser> {
    return UserModel.findById(id).lean<UserDocument>().exec();
  },

  findByPhone(phone: string): Promise<LeanUser> {
    return UserModel.findOne({ phone }).lean<UserDocument>().exec();
  },

  /**
   * Includes the password hash, which is `select: false` everywhere else.
   * Only the password login path may call this.
   */
  findByEmailWithPassword(email: string): Promise<LeanUser> {
    return UserModel.findOne({ email }).select('+passwordHash').lean<UserDocument>().exec();
  },

  existsByEmail(email: string): Promise<boolean> {
    return UserModel.exists({ email })
      .exec()
      .then((doc) => doc !== null);
  },

  async createOtpUser(input: CreateOtpUserInput): Promise<UserDocument> {
    const created = await UserModel.create({
      phone: input.phone,
      preferredLanguage: input.preferredLanguage ?? 'hi',
      role: 'USER',
      status: 'PENDING_PROFILE',
      phoneVerifiedAt: new Date(),
    });
    return created.toObject<UserDocument>();
  },

  async createStaffUser(input: CreateStaffUserInput): Promise<UserDocument> {
    const created = await UserModel.create({
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      role: input.role,
      phone: input.phone ?? null,
      preferredLanguage: input.preferredLanguage ?? 'en',
      status: 'ACTIVE',
    });
    return created.toObject<UserDocument>();
  },

  updateProfile(id: string, patch: UpdateProfileInput): Promise<LeanUser> {
    const update: UpdateQuery<UserDocument> = { ...patch };
    // Supplying a name is what completes onboarding.
    if (patch.fullName) update.status = 'ACTIVE';
    return this.updateById(id, update);
  },

  updateRole(id: string, role: Role): Promise<LeanUser> {
    return this.updateById(id, { role });
  },

  updateStatus(id: string, status: UserStatus): Promise<LeanUser> {
    return this.updateById(id, { status });
  },

  /**
   * DPDP erasure: the PII is destroyed, the row survives as a tombstone so audit
   * records and hierarchy edges do not dangle.
   */
  softDelete(id: string): Promise<LeanUser> {
    return this.updateById(id, {
      status: 'DELETED',
      phone: null,
      email: null,
      fullName: null,
      gender: null,
      passwordHash: null,
      phoneVerifiedAt: null,
    });
  },

  /** Fire-and-forget: a failed timestamp write must never fail the login itself. */
  async touchLastLogin(id: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { lastLoginAt: new Date() }).exec();
  },

  updateById(id: string, update: UpdateQuery<UserDocument>): Promise<LeanUser> {
    return UserModel.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .lean<UserDocument>()
      .exec();
  },

  async list(filter: ListUsersFilter): Promise<{ items: UserDocument[]; total: number }> {
    const query = buildListQuery(filter);
    const skip = (filter.page - 1) * filter.pageSize;

    // Both halves are independent — issue them concurrently rather than serially.
    const [items, total] = await Promise.all([
      UserModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.pageSize)
        .lean<UserDocument[]>(lean)
        .exec(),
      UserModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  },

  countByRole(role: Role): Promise<number> {
    return UserModel.countDocuments({ role, status: 'ACTIVE' }).exec();
  },
};
