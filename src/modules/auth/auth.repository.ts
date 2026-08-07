import { Types } from 'mongoose';
import { OtpChallengeModel, type OtpChallengeDocument } from './otpChallenge.model.js';
import {
  RefreshTokenModel,
  type RefreshTokenDocument,
  type RevokeReason,
} from './refreshToken.model.js';

/** The only place the `otp_challenges` collection is touched. */
export const otpChallengeRepository = {
  create(input: {
    phone: string;
    codeHash: string;
    expiresAt: Date;
    requestIp: string | null;
  }): Promise<OtpChallengeDocument> {
    return OtpChallengeModel.create(input).then((doc) => doc.toObject<OtpChallengeDocument>());
  },

  /** Newest challenge for a phone, consumed or not — lockouts must survive a resend. */
  findLatest(phone: string): Promise<OtpChallengeDocument | null> {
    return OtpChallengeModel.findOne({ phone })
      .sort({ createdAt: -1 })
      .lean<OtpChallengeDocument>()
      .exec();
  },

  countSince(phone: string, since: Date): Promise<number> {
    return OtpChallengeModel.countDocuments({ phone, createdAt: { $gte: since } }).exec();
  },

  /**
   * Atomic increment: two concurrent verify requests must not both read `attempts`
   * as 4 and each conclude they have an attempt left.
   */
  incrementAttempts(id: Types.ObjectId, lockedUntil: Date | null): Promise<unknown> {
    const update = lockedUntil ? { $inc: { attempts: 1 }, $set: { lockedUntil } } : { $inc: { attempts: 1 } };
    return OtpChallengeModel.updateOne({ _id: id }, update).exec();
  },

  markConsumed(id: Types.ObjectId): Promise<unknown> {
    return OtpChallengeModel.updateOne({ _id: id }, { consumedAt: new Date() }).exec();
  },

  /** Invalidates outstanding codes for a phone once one of them has been used. */
  consumeAllForPhone(phone: string): Promise<unknown> {
    return OtpChallengeModel.updateMany(
      { phone, consumedAt: null },
      { consumedAt: new Date() },
    ).exec();
  },
};

/** The only place the `refresh_tokens` collection is touched. */
export const refreshTokenRepository = {
  create(input: {
    userId: string;
    tokenHash: string;
    familyId: string;
    deviceId: string;
    deviceName: string | null;
    platform: string | null;
    ip: string | null;
    expiresAt: Date;
  }): Promise<RefreshTokenDocument> {
    return RefreshTokenModel.create({
      ...input,
      userId: new Types.ObjectId(input.userId),
    }).then((doc) => doc.toObject<RefreshTokenDocument>());
  },

  findByTokenHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({ tokenHash }).lean<RefreshTokenDocument>().exec();
  },

  findById(id: string, userId: string): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .lean<RefreshTokenDocument>()
      .exec();
  },

  /** Active sessions for the "your devices" screen. */
  listActive(userId: string): Promise<RefreshTokenDocument[]> {
    return RefreshTokenModel.find({
      userId: new Types.ObjectId(userId),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean<RefreshTokenDocument[]>()
      .exec();
  },

  markUsed(id: Types.ObjectId): Promise<unknown> {
    return RefreshTokenModel.updateOne({ _id: id }, { lastUsedAt: new Date() }).exec();
  },

  revokeById(id: Types.ObjectId, reason: RevokeReason): Promise<unknown> {
    return RefreshTokenModel.updateOne(
      { _id: id, revokedAt: null },
      { revokedAt: new Date(), revokedReason: reason },
    ).exec();
  },

  /** Reuse detection: kill every token descended from the compromised login. */
  revokeFamily(familyId: string, reason: RevokeReason): Promise<{ modifiedCount: number }> {
    return RefreshTokenModel.updateMany(
      { familyId, revokedAt: null },
      { revokedAt: new Date(), revokedReason: reason },
    )
      .exec()
      .then((result) => ({ modifiedCount: result.modifiedCount }));
  },

  revokeAllForUser(userId: string, reason: RevokeReason): Promise<{ modifiedCount: number }> {
    return RefreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { revokedAt: new Date(), revokedReason: reason },
    )
      .exec()
      .then((result) => ({ modifiedCount: result.modifiedCount }));
  },
};
