import { Schema, model, type Model, type Types } from 'mongoose';
import { COLLECTIONS } from '../../config/index.js';

/**
 * A pending OTP. The code itself is never stored — only its SHA-256 hash — so a
 * database dump cannot be replayed to log in as someone else.
 *
 * Rows delete themselves via a TTL index rather than a cleanup job. `expiresAt` is
 * still checked in code: Mongo's TTL monitor runs about once a minute, so an
 * expired row can briefly still exist.
 */
export interface OtpChallengeDocument {
  _id: Types.ObjectId;
  phone: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  /** Set when the attempt limit is hit; blocks new verifies until it passes. */
  lockedUntil: Date | null;
  requestIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const otpChallengeSchema = new Schema<OtpChallengeDocument>(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    lockedUntil: { type: Date, default: null },
    requestIp: { type: String, default: null },
  },
  { timestamps: true, collection: COLLECTIONS.OTP_CHALLENGES, id: false },
);

// Newest unconsumed challenge for a phone — the hot path on every verify.
otpChallengeSchema.index({ phone: 1, createdAt: -1 });

/**
 * Self-expiry. Retained an hour past `expiresAt` so the per-phone hourly quota can
 * still count recent requests after the code itself is dead.
 */
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const OtpChallengeModel: Model<OtpChallengeDocument> = model<OtpChallengeDocument>(
  'OtpChallenge',
  otpChallengeSchema,
);
