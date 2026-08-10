import { Types, type FilterQuery, type UpdateQuery } from 'mongoose';
import { JOIN_CODE_MAX_ATTEMPTS } from '../../config/index.js';
import { CommunityModel, type CommunityDocument } from './communities.model.js';
import { generateJoinCode } from './joinCode.js';
import { LIVE_COMMUNITY_STATUSES, type ListCommunitiesFilter } from './communities.types.js';

type LeanCommunity = CommunityDocument | null;

/** Escapes a user-supplied search term so it cannot inject regex metacharacters. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Mongo's duplicate-key error, narrowed to the index that actually collided. */
interface MongoDuplicateKeyError {
  code: number;
  keyPattern?: Record<string, unknown>;
}

function asDuplicateKeyError(error: unknown): MongoDuplicateKeyError | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as { code?: unknown; keyPattern?: Record<string, unknown> };
  if (candidate.code !== 11000) return null;
  return { code: 11000, ...(candidate.keyPattern ? { keyPattern: candidate.keyPattern } : {}) };
}

export const isJoinCodeCollision = (error: unknown): boolean =>
  asDuplicateKeyError(error)?.keyPattern?.['joinCode'] !== undefined;

export const isLeaderCollision = (error: unknown): boolean =>
  asDuplicateKeyError(error)?.keyPattern?.['leaderId'] !== undefined;

function buildListQuery(filter: ListCommunitiesFilter): FilterQuery<CommunityDocument> {
  const query: FilterQuery<CommunityDocument> = {};

  if (filter.status) query.status = filter.status;
  if (filter.type) query.type = filter.type;
  if (filter.leaderId) query.leaderId = new Types.ObjectId(filter.leaderId);

  if (filter.search) {
    const term = new RegExp(escapeRegex(filter.search), 'i');
    query.$or = [{ name: term }, { joinCode: term }];
  }

  return query;
}

/**
 * The only place the `communities` collection is touched. Every read returns a
 * lean plain object so nothing upstream can call `.save()` and route around the
 * service layer's authorisation checks.
 */
export const communitiesRepository = {
  findById(id: string): Promise<LeanCommunity> {
    return CommunityModel.findById(id).lean<CommunityDocument>().exec();
  },

  /**
   * Resolves a code to a live community. Archived and rejected communities are
   * excluded here rather than filtered by the caller — a released code belongs to
   * whoever holds it next, and this is the only lookup path.
   */
  findByJoinCode(joinCode: string): Promise<LeanCommunity> {
    return CommunityModel.findOne({
      joinCode,
      status: { $in: LIVE_COMMUNITY_STATUSES },
    })
      .lean<CommunityDocument>()
      .exec();
  },

  /** The community currently occupying this leader's single slot, if any. */
  findLiveByLeader(leaderId: string): Promise<LeanCommunity> {
    return CommunityModel.findOne({
      leaderId: new Types.ObjectId(leaderId),
      status: { $in: LIVE_COMMUNITY_STATUSES },
    })
      .lean<CommunityDocument>()
      .exec();
  },

  /**
   * Inserts with a freshly minted code, retrying on the astronomically unlikely
   * code collision. A `leaderId` collision is *not* retried — it means the leader
   * already has a community, which is a business rule the caller must surface.
   */
  async create(
    input: Omit<CommunityDocument, '_id' | 'joinCode' | 'joinCodeUpdatedAt' | 'createdAt' | 'updatedAt'>,
  ): Promise<CommunityDocument> {
    let lastError: unknown;

    for (let attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt++) {
      try {
        const created = await CommunityModel.create({
          ...input,
          joinCode: generateJoinCode(),
          joinCodeUpdatedAt: new Date(),
        });
        return created.toObject<CommunityDocument>();
      } catch (error) {
        if (!isJoinCodeCollision(error)) throw error;
        lastError = error;
      }
    }

    throw lastError;
  },

  /** Issues a new code, retrying past collisions. Returns the updated document. */
  async rotateJoinCode(id: string): Promise<LeanCommunity> {
    let lastError: unknown;

    for (let attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.updateById(id, {
          joinCode: generateJoinCode(),
          joinCodeUpdatedAt: new Date(),
        });
      } catch (error) {
        if (!isJoinCodeCollision(error)) throw error;
        lastError = error;
      }
    }

    throw lastError;
  },

  updateById(id: string, update: UpdateQuery<CommunityDocument>): Promise<LeanCommunity> {
    return CommunityModel.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .lean<CommunityDocument>()
      .exec();
  },

  /**
   * Adjusts the denormalised member counter.
   *
   * `$inc` with a `$max`-style floor rather than a read-modify-write: two people
   * joining at the same instant must not both read `4` and both write `5`.
   */
  async adjustMemberCount(id: string, delta: number): Promise<void> {
    await CommunityModel.updateOne({ _id: id }, { $inc: { memberCount: delta } }).exec();
  },

  async list(
    filter: ListCommunitiesFilter,
  ): Promise<{ items: CommunityDocument[]; total: number }> {
    const query = buildListQuery(filter);
    const skip = (filter.page - 1) * filter.pageSize;

    const [items, total] = await Promise.all([
      CommunityModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.pageSize)
        .lean<CommunityDocument[]>({ lean: true })
        .exec(),
      CommunityModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  },

  countByStatus(): Promise<{ _id: string; count: number }[]> {
    return CommunityModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();
  },
};
