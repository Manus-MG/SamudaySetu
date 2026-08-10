import { Types } from 'mongoose';
import { AppError, ErrorCode } from '../../core/errors/index.js';
import type { Principal } from '../../core/security/index.js';
import { paginate, type Paginated } from '../../shared/types.js';
import { auditService } from '../audit/audit.service.js';
import type { AuditAction } from '../audit/audit.types.js';
import { usersService } from '../users/users.service.js';
import type { UserDto } from '../users/users.types.js';
import {
  isAcceptingMembers,
  toCommunityDto,
  toCommunityPreviewDto,
  toJoinKitDto,
} from './communities.mapper.js';
import type { CommunityDocument } from './communities.model.js';
import { communitiesRepository, isLeaderCollision } from './communities.repository.js';
import type {
  CommunityDto,
  CommunityPreviewDto,
  CommunityStatus,
  CreateCommunityInput,
  JoinKitDto,
  ListCommunitiesFilter,
  UpdateCommunityInput,
} from './communities.types.js';
import { normaliseJoinCode } from './joinCode.js';

/** The staff-side moderation verbs, as they arrive from the API. */
export type ModerationAction = 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE';

/**
 * The only permitted status transitions, as an explicit table.
 *
 * A table rather than a chain of `if`s because this *is* the lifecycle: reading
 * it tells you the whole state machine, and an illegal transition is impossible
 * to express rather than merely unlikely to be written.
 */
const MODERATION_TRANSITIONS: Readonly<
  Record<ModerationAction, { from: readonly CommunityStatus[]; to: CommunityStatus; audit: AuditAction }>
> = Object.freeze({
  APPROVE: { from: ['PENDING_APPROVAL'], to: 'ACTIVE', audit: 'COMMUNITY_APPROVED' },
  REJECT: { from: ['PENDING_APPROVAL'], to: 'REJECTED', audit: 'COMMUNITY_REJECTED' },
  SUSPEND: { from: ['ACTIVE'], to: 'SUSPENDED', audit: 'COMMUNITY_SUSPENDED' },
  REACTIVATE: { from: ['SUSPENDED'], to: 'ACTIVE', audit: 'COMMUNITY_REACTIVATED' },
});

const STAFF_ROLES_WITH_FULL_SCOPE = ['SUPER_ADMIN', 'ADMIN'] as const;

const hasFullScope = (actor: Principal): boolean =>
  (STAFF_ROLES_WITH_FULL_SCOPE as readonly string[]).includes(actor.role);

/**
 * Last-resort id guard. Everything reaching the service has already passed the
 * route's `objectIdSchema`, so this exists to keep `new Types.ObjectId(...)` out
 * of the business logic rather than to catch realistic input.
 */
function toObjectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid identifier');
  return new Types.ObjectId(id);
}

// ── Guards ───────────────────────────────────────────────────────────────────

async function getOrThrow(id: string): Promise<CommunityDocument> {
  const community = await communitiesRepository.findById(id);
  if (!community) {
    throw AppError.notFound('Community not found', { messageHi: 'समुदाय नहीं मिला।' });
  }
  return community;
}

/**
 * Row-level scoping, applied *after* the route's permission check.
 *
 * A `LEADER` holds `community:read` and `community:update`, which is what lets
 * them reach the handler at all. This is what confines those verbs to the one
 * community they actually run — without it, holding the permission would mean
 * holding it over every tenant on the platform.
 */
function assertMayManage(actor: Principal, community: CommunityDocument): void {
  if (hasFullScope(actor)) return;

  if (community.leaderId?.toString() !== actor.userId) {
    throw AppError.forbidden('You can only manage the community you lead', {
      messageHi: 'आप केवल अपने समुदाय का प्रबंधन कर सकते हैं।',
    });
  }

  if (community.status === 'ARCHIVED' || community.status === 'REJECTED') {
    throw AppError.forbidden('This community is closed and can no longer be changed', {
      messageHi: 'यह समुदाय बंद हो चुका है।',
    });
  }
}

/**
 * Validates a prospective leader: the account must exist, be usable, already hold
 * the `LEADER` role, and not already be running something else.
 *
 * Promoting the account here would be the convenient thing to do and the wrong
 * one — granting a role is `user:role:assign`, a permission the community routes
 * deliberately do not require.
 */
async function assertAssignableLeader(leaderId: string, communityId?: string): Promise<UserDto> {
  const leader = await usersService.getById(leaderId);

  if (leader.status !== 'ACTIVE') {
    throw AppError.badRequest('The selected leader account is not active', {
      messageHi: 'चयनित नेता का खाता सक्रिय नहीं है।',
    });
  }

  if (leader.role !== 'LEADER') {
    throw AppError.badRequest(
      'Only an account with the Leader role can lead a community. Change the role first.',
      { messageHi: 'केवल नेता भूमिका वाला खाता समुदाय का नेतृत्व कर सकता है।' },
    );
  }

  const existing = await communitiesRepository.findLiveByLeader(leaderId);
  if (existing && existing._id.toString() !== communityId) {
    throw AppError.conflict('This leader already runs a community', {
      messageHi: 'यह नेता पहले से एक समुदाय चला रहा है।',
      details: { communityId: existing._id.toString(), communityName: existing.name },
    });
  }

  return leader;
}

/** Normalises the optional location patch into the document's flat shape. */
function toLocationUpdate(
  location: NonNullable<UpdateCommunityInput['location']>,
): CommunityDocument['location'] {
  return {
    state: location.state ?? null,
    district: location.district ?? null,
    city: location.city ?? null,
    pincode: location.pincode ?? null,
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

export const communitiesService = {
  /**
   * Creates a community.
   *
   * Who creates it decides whether it is live: staff creations are approved on the
   * spot because the approver is the one making the request, while a leader's
   * creation lands in `PENDING_APPROVAL` and cannot recruit until staff clear it.
   */
  async create(actor: Principal, input: CreateCommunityInput, ip?: string): Promise<CommunityDto> {
    const isStaff = hasFullScope(actor);

    // A leader may only ever nominate themselves, whatever the payload says.
    const leaderId = isStaff ? input.leaderId : actor.userId;

    if (leaderId) {
      if (isStaff) {
        await assertAssignableLeader(leaderId);
      } else {
        const existing = await communitiesRepository.findLiveByLeader(actor.userId);
        if (existing) {
          throw AppError.conflict('You already have a community', {
            messageHi: 'आपके पास पहले से एक समुदाय है।',
            details: { communityId: existing._id.toString(), status: existing.status },
          });
        }
      }
    }

    const now = new Date();
    const status: CommunityStatus = isStaff ? 'ACTIVE' : 'PENDING_APPROVAL';

    let created: CommunityDocument;
    try {
      created = await communitiesRepository.create({
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        status,
        leaderId: leaderId ? toObjectId(leaderId) : null,
        createdBy: toObjectId(actor.userId),
        approvedBy: isStaff ? toObjectId(actor.userId) : null,
        approvedAt: isStaff ? now : null,
        rejectionReason: null,
        memberCount: 0,
        isJoinable: true,
        location: toLocationUpdate(input.location ?? {}),
        contactEmail: input.contactEmail ?? null,
        contactPhone: input.contactPhone ?? null,
      });
    } catch (error) {
      // The unique index caught a race the read above could not.
      if (isLeaderCollision(error)) {
        throw AppError.conflict('That leader already runs a community', {
          messageHi: 'यह नेता पहले से एक समुदाय चला रहा है।',
        });
      }
      throw error;
    }

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'COMMUNITY_CREATED',
      resourceType: 'COMMUNITY',
      resourceId: created._id.toString(),
      communityId: created._id.toString(),
      summary: `Created community "${created.name}" (${status.toLowerCase().replace('_', ' ')})`,
      metadata: { type: created.type, status, leaderId: leaderId ?? null },
      ip: ip ?? null,
    });

    return toCommunityDto(created);
  },

  /** Staff see everything; a leader's list is silently narrowed to their own. */
  async list(actor: Principal, filter: ListCommunitiesFilter): Promise<Paginated<CommunityDto>> {
    const scoped: ListCommunitiesFilter = hasFullScope(actor)
      ? filter
      : { ...filter, leaderId: actor.userId };

    const { items, total } = await communitiesRepository.list(scoped);
    return paginate(items.map(toCommunityDto), total, scoped.page, scoped.pageSize);
  },

  async getById(actor: Principal, id: string): Promise<CommunityDto> {
    const community = await getOrThrow(id);
    assertMayManage(actor, community);
    return toCommunityDto(community);
  },

  /**
   * The signed-in actor's own community: the one a leader runs, or the one a
   * member joined. `null` for staff, who administer communities rather than
   * belong to one.
   */
  async getMine(actor: Principal): Promise<CommunityDto | null> {
    if (actor.role === 'LEADER') {
      const led = await communitiesRepository.findLiveByLeader(actor.userId);
      return led ? toCommunityDto(led) : null;
    }

    const user = await usersService.getById(actor.userId);
    if (!user.communityId) return null;

    const community = await communitiesRepository.findById(user.communityId);
    return community ? toCommunityDto(community) : null;
  },

  async update(
    actor: Principal,
    id: string,
    patch: UpdateCommunityInput,
    ip?: string,
  ): Promise<CommunityDto> {
    const community = await getOrThrow(id);
    assertMayManage(actor, community);

    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update['name'] = patch.name;
    if (patch.description !== undefined) update['description'] = patch.description;
    if (patch.type !== undefined) update['type'] = patch.type;
    if (patch.contactEmail !== undefined) update['contactEmail'] = patch.contactEmail;
    if (patch.contactPhone !== undefined) update['contactPhone'] = patch.contactPhone;
    if (patch.isJoinable !== undefined) update['isJoinable'] = patch.isJoinable;
    if (patch.location !== undefined) update['location'] = toLocationUpdate(patch.location);

    const updated = await communitiesRepository.updateById(id, update);
    if (!updated) throw AppError.notFound('Community not found');

    // Opening and closing recruitment is a distinct event operationally — it is
    // the switch someone flips right before a leak becomes a problem.
    if (patch.isJoinable !== undefined && patch.isJoinable !== community.isJoinable) {
      void auditService.record({
        actorId: actor.userId,
        actorRole: actor.role,
        action: patch.isJoinable ? 'COMMUNITY_JOINING_OPENED' : 'COMMUNITY_JOINING_CLOSED',
        resourceType: 'COMMUNITY',
        resourceId: id,
        communityId: id,
        summary: `${patch.isJoinable ? 'Opened' : 'Closed'} joining for "${updated.name}"`,
        ip: ip ?? null,
      });
    }

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'COMMUNITY_UPDATED',
      resourceType: 'COMMUNITY',
      resourceId: id,
      communityId: id,
      summary: `Updated community "${updated.name}"`,
      metadata: { fields: Object.keys(update) },
      ip: ip ?? null,
    });

    return toCommunityDto(updated);
  },

  /**
   * Approve, reject, suspend or reactivate. The transition table above is the
   * authority on what is legal from the current status.
   */
  async moderate(
    actor: Principal,
    id: string,
    action: ModerationAction,
    reason: string | undefined,
    ip?: string,
  ): Promise<CommunityDto> {
    const community = await getOrThrow(id);
    const transition = MODERATION_TRANSITIONS[action];

    if (!transition.from.includes(community.status)) {
      throw AppError.conflict(
        `Cannot ${action.toLowerCase()} a community that is ${community.status.toLowerCase().replace('_', ' ')}`,
        { details: { currentStatus: community.status, allowedFrom: transition.from } },
      );
    }

    if (action === 'REJECT' && !reason) {
      throw AppError.badRequest('A reason is required when rejecting a community', {
        messageHi: 'अस्वीकार करने के लिए कारण आवश्यक है।',
      });
    }

    const update: Record<string, unknown> = { status: transition.to };
    if (action === 'APPROVE') {
      update['approvedBy'] = toObjectId(actor.userId);
      update['approvedAt'] = new Date();
      update['rejectionReason'] = null;
    }
    if (action === 'REJECT') {
      update['rejectionReason'] = reason ?? null;
      // A rejected community must not keep its leader's single slot occupied.
      update['leaderId'] = null;
    }

    const updated = await communitiesRepository.updateById(id, update);
    if (!updated) throw AppError.notFound('Community not found');

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: transition.audit,
      resourceType: 'COMMUNITY',
      resourceId: id,
      communityId: id,
      summary: `${action[0] ?? ''}${action.slice(1).toLowerCase()}d community "${updated.name}"`,
      metadata: { from: community.status, to: transition.to, ...(reason ? { reason } : {}) },
      ip: ip ?? null,
    });

    return toCommunityDto(updated);
  },

  /** Assigns or replaces the single leader. Staff-only, by permission. */
  async assignLeader(
    actor: Principal,
    id: string,
    leaderId: string,
    ip?: string,
  ): Promise<CommunityDto> {
    const community = await getOrThrow(id);

    if (community.status === 'ARCHIVED' || community.status === 'REJECTED') {
      throw AppError.conflict('This community is closed', {
        messageHi: 'यह समुदाय बंद हो चुका है।',
      });
    }

    const leader = await assertAssignableLeader(leaderId, id);

    let updated: CommunityDocument | null;
    try {
      updated = await communitiesRepository.updateById(id, {
        leaderId: toObjectId(leaderId),
      });
    } catch (error) {
      if (isLeaderCollision(error)) {
        throw AppError.conflict('That leader already runs a community', {
          messageHi: 'यह नेता पहले से एक समुदाय चला रहा है।',
        });
      }
      throw error;
    }
    if (!updated) throw AppError.notFound('Community not found');

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'COMMUNITY_LEADER_ASSIGNED',
      resourceType: 'COMMUNITY',
      resourceId: id,
      communityId: id,
      summary: `Assigned ${leader.fullName ?? leader.email ?? leaderId} as leader of "${updated.name}"`,
      metadata: { previousLeaderId: community.leaderId?.toString() ?? null, leaderId },
      ip: ip ?? null,
    });

    return toCommunityDto(updated);
  },

  async removeLeader(actor: Principal, id: string, ip?: string): Promise<CommunityDto> {
    const community = await getOrThrow(id);

    if (!community.leaderId) {
      throw AppError.conflict('This community has no leader assigned');
    }

    const updated = await communitiesRepository.updateById(id, { leaderId: null });
    if (!updated) throw AppError.notFound('Community not found');

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'COMMUNITY_LEADER_REMOVED',
      resourceType: 'COMMUNITY',
      resourceId: id,
      communityId: id,
      summary: `Removed the leader of "${updated.name}"`,
      metadata: { previousLeaderId: community.leaderId.toString() },
      ip: ip ?? null,
    });

    return toCommunityDto(updated);
  },

  /**
   * Issues a new join code and invalidates the old one immediately.
   *
   * This is the containment action when a code leaks — a poster photographed and
   * forwarded into the wrong group chat. Existing members are unaffected; only
   * the door changes.
   */
  async rotateJoinCode(actor: Principal, id: string, ip?: string): Promise<JoinKitDto> {
    const community = await getOrThrow(id);
    assertMayManage(actor, community);

    const updated = await communitiesRepository.rotateJoinCode(id);
    if (!updated) throw AppError.notFound('Community not found');

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'COMMUNITY_JOIN_CODE_ROTATED',
      resourceType: 'COMMUNITY',
      resourceId: id,
      communityId: id,
      // The code itself is never written to the audit log: the trail is read by
      // more people than may hold the key to a community.
      summary: `Rotated the join code for "${updated.name}"`,
      ip: ip ?? null,
    });

    return toJoinKitDto(updated);
  },

  /** Code, link, deep link, QR and share text for an existing community. */
  async getJoinKit(actor: Principal, id: string): Promise<JoinKitDto> {
    const community = await getOrThrow(id);
    assertMayManage(actor, community);
    return toJoinKitDto(community);
  },

  /** The QR on its own, as a downloadable/printable SVG document. */
  async getJoinQrSvg(actor: Principal, id: string): Promise<{ svg: string; name: string }> {
    const community = await getOrThrow(id);
    assertMayManage(actor, community);

    const { qrDataUrl } = toJoinKitDto(community);
    const base64 = qrDataUrl.slice(qrDataUrl.indexOf(',') + 1);
    return { svg: Buffer.from(base64, 'base64').toString('utf8'), name: community.name };
  },

  /**
   * Soft delete. Members are released and the join code returns to the pool, so a
   * poster for an archived community resolves to "not found" rather than to a
   * ghost that still accepts joins.
   */
  async archive(actor: Principal, id: string, ip?: string): Promise<CommunityDto> {
    const community = await getOrThrow(id);

    if (community.status === 'ARCHIVED') {
      throw AppError.conflict('This community is already archived');
    }

    const released = await usersService.detachAllFromCommunity(id);

    const updated = await communitiesRepository.updateById(id, {
      status: 'ARCHIVED',
      leaderId: null,
      isJoinable: false,
      memberCount: 0,
    });
    if (!updated) throw AppError.notFound('Community not found');

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'COMMUNITY_ARCHIVED',
      resourceType: 'COMMUNITY',
      resourceId: id,
      communityId: id,
      summary: `Archived community "${updated.name}" and released ${String(released)} member(s)`,
      metadata: { releasedMembers: released, previousStatus: community.status },
      ip: ip ?? null,
    });

    return toCommunityDto(updated);
  },

  // ── The member-facing path ─────────────────────────────────────────────────

  /**
   * Resolves a code, however it was typed, scanned or pasted.
   *
   * Always returns a *reason* rather than a bare 404 for live-but-closed
   * communities, so the app can say "this community has paused joining" instead of
   * "wrong code" and send the user back to retype something that was correct.
   */
  async previewByCode(rawCode: string): Promise<CommunityPreviewDto> {
    const code = normaliseJoinCode(rawCode);
    const community = await communitiesRepository.findByJoinCode(code);

    if (!community) {
      throw AppError.notFound('No community found for this code', {
        messageHi: 'इस कोड से कोई समुदाय नहीं मिला।',
        details: { unavailableReason: 'NOT_FOUND' },
      });
    }

    const reason: CommunityPreviewDto['unavailableReason'] =
      community.status === 'PENDING_APPROVAL'
        ? 'NOT_APPROVED'
        : community.status === 'SUSPENDED'
          ? 'SUSPENDED'
          : community.isJoinable
            ? null
            : 'CLOSED';

    return toCommunityPreviewDto(community, reason);
  },

  /**
   * Joins by code. Idempotent for the community the user is already in, so a
   * double-tap or a retried request does not produce an error the user cannot act
   * on — and, crucially, does not double-count them.
   */
  async joinByCode(actor: Principal, rawCode: string, ip?: string): Promise<CommunityDto> {
    if (actor.role !== 'USER') {
      throw AppError.forbidden('Staff and leader accounts cannot join a community as members', {
        messageHi: 'स्टाफ़ और नेता खाते सदस्य के रूप में शामिल नहीं हो सकते।',
      });
    }

    const code = normaliseJoinCode(rawCode);
    const community = await communitiesRepository.findByJoinCode(code);

    if (!community) {
      throw AppError.notFound('No community found for this code', {
        messageHi: 'इस कोड से कोई समुदाय नहीं मिला।',
      });
    }

    if (!isAcceptingMembers(community)) {
      throw new AppError(
        409,
        ErrorCode.CONFLICT,
        community.status === 'PENDING_APPROVAL'
          ? 'This community is waiting for approval and cannot accept members yet'
          : 'This community is not accepting new members right now',
        { messageHi: 'यह समुदाय अभी नए सदस्य नहीं ले रहा है।' },
      );
    }

    const communityId = community._id.toString();
    const attached = await usersService.attachToCommunity(actor.userId, communityId);

    if (!attached) {
      // The conditional update did nothing, which means the user already belongs
      // somewhere. Re-read to tell "already here" from "already elsewhere".
      const user = await usersService.getById(actor.userId);
      if (user.communityId === communityId) return toCommunityDto(community);

      throw AppError.conflict('You are already a member of another community', {
        messageHi: 'आप पहले से किसी अन्य समुदाय के सदस्य हैं।',
      });
    }

    await communitiesRepository.adjustMemberCount(communityId, 1);

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'COMMUNITY_MEMBER_JOINED',
      resourceType: 'USER',
      resourceId: actor.userId,
      communityId,
      summary: `Joined community "${community.name}"`,
      ip: ip ?? null,
    });

    // Re-read so the caller gets the post-join member count rather than a stale one.
    const refreshed = await communitiesRepository.findById(communityId);
    return toCommunityDto(refreshed ?? community);
  },

  async leave(actor: Principal, ip?: string): Promise<{ left: boolean }> {
    const user = await usersService.getById(actor.userId);
    if (!user.communityId) {
      throw AppError.conflict('You are not a member of any community', {
        messageHi: 'आप किसी समुदाय के सदस्य नहीं हैं।',
      });
    }

    const communityId = user.communityId;
    const detached = await usersService.detachFromCommunity(actor.userId, communityId);
    if (!detached) return { left: false };

    await communitiesRepository.adjustMemberCount(communityId, -1);

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'COMMUNITY_MEMBER_LEFT',
      resourceType: 'USER',
      resourceId: actor.userId,
      communityId,
      summary: 'Left the community',
      ip: ip ?? null,
    });

    return { left: true };
  },

  /** Member directory for one community, scoped the same way as every other read. */
  async listMembers(
    actor: Principal,
    id: string,
    filter: { search?: string; page: number; pageSize: number },
  ): Promise<Paginated<UserDto>> {
    const community = await getOrThrow(id);
    assertMayManage(actor, community);

    return usersService.list({
      communityId: id,
      role: 'USER',
      ...(filter.search ? { search: filter.search } : {}),
      page: filter.page,
      pageSize: filter.pageSize,
    });
  },

  /**
   * Recomputes the denormalised counter from the member rows.
   *
   * `memberCount` is maintained with `$inc`, which is correct under concurrency
   * but not under a process that dies between the two writes in `joinByCode`.
   * This is the repair, exposed so it can be run from the console rather than
   * requiring a database session.
   */
  async reconcileMemberCount(actor: Principal, id: string): Promise<CommunityDto> {
    const community = await getOrThrow(id);
    assertMayManage(actor, community);

    const actual = await usersService.countByCommunity(id);
    const updated = await communitiesRepository.updateById(id, { memberCount: actual });
    if (!updated) throw AppError.notFound('Community not found');

    return toCommunityDto(updated);
  },
};
