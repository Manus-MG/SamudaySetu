import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { COLLECTIONS } from '../../config/index.js';
import { ROLES, type Role } from '../../core/security/index.js';
import type { Gender, SupportedLanguage } from '../../shared/types.js';
import { USER_STATUSES, type UserStatus } from './users.types.js';

export interface UserDocument {
  _id: Types.ObjectId;
  phone: string | null;
  email: string | null;
  /** Present only for staff accounts; members authenticate by OTP. */
  passwordHash: string | null;
  fullName: string | null;
  gender: Gender | null;
  preferredLanguage: SupportedLanguage;
  role: Role;
  status: UserStatus;
  /**
   * The community this account belongs to as a member, or `null`.
   *
   * Exactly one, by product decision: a member joins a single community with a
   * single code. Staff accounts (`ADMIN`, `SUPER_ADMIN`) leave this `null` — they
   * administer communities rather than belong to one — and a `LEADER`'s link to
   * the community they run lives on `communities.leaderId`, not here.
   */
  communityId: Types.ObjectId | null;
  joinedCommunityAt: Date | null;
  phoneVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserHydrated = HydratedDocument<UserDocument>;

const userSchema = new Schema<UserDocument>(
  {
    // `null` rather than absent, so the partial unique indexes below behave
    // predictably for accounts that have only one of phone/email.
    phone: { type: String, default: null, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },

    // `select: false` — the hash must never arrive in a document by accident.
    // Login explicitly opts in with `.select('+passwordHash')`.
    passwordHash: { type: String, default: null, select: false },

    fullName: { type: String, default: null, trim: true, maxlength: 80 },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
      default: null,
    },
    preferredLanguage: { type: String, enum: ['hi', 'en', 'bho', 'mai', 'ur'], default: 'hi' },

    role: { type: String, enum: ROLES, required: true, default: 'USER' },
    status: { type: String, enum: USER_STATUSES, required: true, default: 'PENDING_PROFILE' },

    communityId: { type: Schema.Types.ObjectId, ref: 'Community', default: null },
    joinedCommunityAt: { type: Date, default: null },

    phoneVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.USERS,
    // Reads go through the repository, which returns lean objects; disabling the
    // virtual keeps the shape identical between lean and hydrated results.
    id: false,
  },
);

// Partial uniqueness: many accounts legitimately have no email (members) or no
// phone (staff). A plain unique index would collide on the second `null`.
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } },
);
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);

// Admin directory: filter by role/status, newest first.
userSchema.index({ role: 1, status: 1, createdAt: -1 });

// Community member directory, and the counter reconciliation query. Leads with
// `communityId` so it can serve both the filtered list and the count.
userSchema.index({ communityId: 1, status: 1, createdAt: -1 });

export const UserModel: Model<UserDocument> = model<UserDocument>('User', userSchema);
