import { Schema, model, type Model, type Types } from 'mongoose';
import { COLLECTIONS } from '../../../config/index.js';
import { INVITE_STATUSES, type InviteStatus } from './invite.types.js';

export interface InviteDocument {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  /** E.164. PII, and redacted from logs by the Pino config. */
  phone: string;
  /**
   * SHA-256 of the token, never the token itself.
   *
   * The link is a bearer credential: whoever holds it joins. A database dump must
   * not be a bag of working invites, exactly as with refresh tokens and OTPs.
   */
  tokenHash: string;
  status: InviteStatus;
  smsDelivered: boolean;
  invitedBy: Types.ObjectId;
  acceptedBy: Types.ObjectId | null;
  acceptedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inviteSchema = new Schema<InviteDocument>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    phone: { type: String, required: true, trim: true },
    tokenHash: { type: String, required: true },

    status: { type: String, enum: INVITE_STATUSES, required: true, default: 'SENT' },
    smsDelivered: { type: Boolean, required: true, default: false },

    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: COLLECTIONS.COMMUNITY_INVITES, id: false },
);

/** The accept path: one indexed equality lookup on a hash. */
inviteSchema.index({ tokenHash: 1 }, { unique: true });

/** The leader's invite list, and the per-hour send quota. */
inviteSchema.index({ communityId: 1, createdAt: -1 });
inviteSchema.index({ communityId: 1, phone: 1, status: 1 });

/**
 * Expired invites are deleted by Mongo rather than swept by a job.
 *
 * The grace period is deliberate: the row is what lets the app say "this invite
 * expired" instead of "invalid link", and that distinction is the difference
 * between a member retrying and a member giving up. After 30 days nobody is still
 * tapping the link, and keeping a phone number past its usefulness is a DPDP
 * liability, not an asset.
 */
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const InviteModel: Model<InviteDocument> = model<InviteDocument>(
  'CommunityInvite',
  inviteSchema,
);
