import { Types, type FilterQuery } from 'mongoose';
import { InviteModel, type InviteDocument } from './invite.model.js';
import type { ListInvitesFilter } from './invite.types.js';

type LeanInvite = InviteDocument | null;

export interface CreateInviteInput {
  communityId: string;
  phone: string;
  tokenHash: string;
  invitedBy: string;
  smsDelivered: boolean;
  expiresAt: Date;
}

export const invitesRepository = {
  async create(input: CreateInviteInput): Promise<InviteDocument> {
    const created = await InviteModel.create({
      communityId: new Types.ObjectId(input.communityId),
      phone: input.phone,
      tokenHash: input.tokenHash,
      invitedBy: new Types.ObjectId(input.invitedBy),
      smsDelivered: input.smsDelivered,
      expiresAt: input.expiresAt,
      status: 'SENT',
    });
    return created.toObject<InviteDocument>();
  },

  findByTokenHash(tokenHash: string): Promise<LeanInvite> {
    return InviteModel.findOne({ tokenHash }).lean<InviteDocument>().exec();
  },

  findById(id: string): Promise<LeanInvite> {
    return InviteModel.findById(id).lean<InviteDocument>().exec();
  },

  /**
   * Marks an invite used, but only from `SENT` and only before it expires.
   *
   * Both conditions live in the query rather than in a preceding read: two taps
   * on a flaky connection arrive as two requests, and a read-then-write would let
   * both succeed. A `null` return means "someone or something already used it".
   */
  markAccepted(id: string, userId: string): Promise<LeanInvite> {
    return InviteModel.findOneAndUpdate(
      { _id: id, status: 'SENT', expiresAt: { $gt: new Date() } },
      { status: 'ACCEPTED', acceptedBy: new Types.ObjectId(userId), acceptedAt: new Date() },
      { new: true },
    )
      .lean<InviteDocument>()
      .exec();
  },

  revoke(id: string): Promise<LeanInvite> {
    return InviteModel.findOneAndUpdate({ _id: id, status: 'SENT' }, { status: 'REVOKED' }, {
      new: true,
    })
      .lean<InviteDocument>()
      .exec();
  },

  /** A live invite already addressed to this phone, so we do not send twice. */
  findUsableForPhone(communityId: string, phone: string): Promise<LeanInvite> {
    return InviteModel.findOne({
      communityId: new Types.ObjectId(communityId),
      phone,
      status: 'SENT',
      expiresAt: { $gt: new Date() },
    })
      .lean<InviteDocument>()
      .exec();
  },

  /** Backs the per-community hourly quota — every SMS costs real money. */
  countSince(communityId: string, since: Date): Promise<number> {
    return InviteModel.countDocuments({
      communityId: new Types.ObjectId(communityId),
      createdAt: { $gte: since },
    }).exec();
  },

  /** Released when a community is archived, so no dead link can still resolve. */
  async revokeAllForCommunity(communityId: string): Promise<number> {
    const result = await InviteModel.updateMany(
      { communityId: new Types.ObjectId(communityId), status: 'SENT' },
      { status: 'REVOKED' },
    ).exec();
    return result.modifiedCount;
  },

  async list(filter: ListInvitesFilter): Promise<{ items: InviteDocument[]; total: number }> {
    const query: FilterQuery<InviteDocument> = {
      communityId: new Types.ObjectId(filter.communityId),
    };
    if (filter.status) query.status = filter.status;

    const skip = (filter.page - 1) * filter.pageSize;

    const [items, total] = await Promise.all([
      InviteModel.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(filter.pageSize)
        .lean<InviteDocument[]>({ lean: true })
        .exec(),
      InviteModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  },
};
