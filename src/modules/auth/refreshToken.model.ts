import { Schema, model, type Model, type Types } from 'mongoose';
import { COLLECTIONS } from '../../config/index.js';

export const REVOKE_REASONS = [
  'LOGOUT',
  'ROTATED',
  'REUSE_DETECTED',
  'ADMIN_REVOKED',
  'ACCOUNT_DISABLED',
] as const;

export type RevokeReason = (typeof REVOKE_REASONS)[number];

/**
 * One row per issued refresh token — effectively a device session.
 *
 * `familyId` groups every token descended from a single login. Rotation replaces
 * one row with the next in the same family; if a token that was already rotated is
 * presented again, that is theft, and the whole family is revoked at once.
 */
export interface RefreshTokenDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** SHA-256 of the opaque token. The token itself is never persisted. */
  tokenHash: string;
  familyId: string;
  deviceId: string;
  deviceName: string | null;
  platform: string | null;
  ip: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: RevokeReason | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true },
    deviceId: { type: String, required: true },
    deviceName: { type: String, default: null, maxlength: 120 },
    platform: { type: String, default: null, maxlength: 40 },
    ip: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: REVOKE_REASONS, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: COLLECTIONS.REFRESH_TOKENS, id: false },
);

// "List my devices" and "revoke everything for this user".
refreshTokenSchema.index({ userId: 1, revokedAt: 1, expiresAt: -1 });
// Reuse detection revokes by family.
refreshTokenSchema.index({ familyId: 1 });

// Expired sessions clean themselves up 7 days later, leaving a short forensic window.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604_800 });

export const RefreshTokenModel: Model<RefreshTokenDocument> = model<RefreshTokenDocument>(
  'RefreshToken',
  refreshTokenSchema,
);
