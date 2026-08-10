import { Schema, model, type Model, type Types } from 'mongoose';
import { COLLECTIONS, JOIN_CODE_LENGTH } from '../../config/index.js';
import {
  COMMUNITY_STATUSES,
  COMMUNITY_TYPES,
  type CommunityStatus,
  type CommunityType,
} from './communities.types.js';

export interface CommunityDocument {
  _id: Types.ObjectId;
  name: string;
  description: string | null;
  type: CommunityType;
  status: CommunityStatus;

  /** Canonical uppercase code. Unique across every non-archived community. */
  joinCode: string;
  joinCodeUpdatedAt: Date;

  leaderId: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  approvedBy: Types.ObjectId | null;
  approvedAt: Date | null;
  rejectionReason: string | null;

  /** Denormalised counter, maintained with `$inc` on join/leave. */
  memberCount: number;
  isJoinable: boolean;

  location: {
    state: string | null;
    district: string | null;
    city: string | null;
    pincode: string | null;
  };
  contactEmail: string | null;
  contactPhone: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema(
  {
    state: { type: String, default: null, trim: true, maxlength: 60 },
    district: { type: String, default: null, trim: true, maxlength: 60 },
    city: { type: String, default: null, trim: true, maxlength: 60 },
    pincode: { type: String, default: null, trim: true, maxlength: 6 },
  },
  { _id: false },
);

const communitySchema = new Schema<CommunityDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    type: { type: String, enum: COMMUNITY_TYPES, required: true },
    status: {
      type: String,
      enum: COMMUNITY_STATUSES,
      required: true,
      default: 'PENDING_APPROVAL',
    },

    joinCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: JOIN_CODE_LENGTH,
      maxlength: JOIN_CODE_LENGTH,
    },
    joinCodeUpdatedAt: { type: Date, required: true, default: () => new Date() },

    // Nullable: an admin may create a community before deciding who runs it.
    leaderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null, trim: true, maxlength: 500 },

    memberCount: { type: Number, required: true, default: 0, min: 0 },
    isJoinable: { type: Boolean, required: true, default: true },

    location: { type: locationSchema, default: () => ({}) },
    contactEmail: { type: String, default: null, trim: true, lowercase: true },
    contactPhone: { type: String, default: null, trim: true },
  },
  { timestamps: true, collection: COLLECTIONS.COMMUNITIES, id: false, minimize: false },
);

/**
 * Join codes are unique among communities that can still be resolved.
 *
 * Partial rather than plain: archiving a community releases its code back into
 * the pool, and a plain unique index would keep dead communities squatting on
 * memorable codes forever. The lookup path filters on the same statuses, so a
 * code can never resolve to two rows.
 */
communitySchema.index(
  { joinCode: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED'] } },
  },
);

/**
 * One live community per leader, enforced by the database rather than only by the
 * service check.
 *
 * The service check is a read-then-write and therefore racy: two concurrent
 * requests can both see "no community yet". This index is what actually makes the
 * rule hold, and it is why `createCommunity` translates a duplicate-key error
 * into a clean 409.
 */
communitySchema.index(
  { leaderId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      leaderId: { $type: 'objectId' },
      status: { $in: ['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED'] },
    },
  },
);

// Console list view: filter by status/type, newest first.
communitySchema.index({ status: 1, type: 1, createdAt: -1 });
communitySchema.index({ createdBy: 1, createdAt: -1 });

export const CommunityModel: Model<CommunityDocument> = model<CommunityDocument>(
  'Community',
  communitySchema,
);
