import { createHash, randomBytes } from 'node:crypto';
import {
  INVITE_MAX_PER_COMMUNITY_PER_HOUR,
  INVITE_TTL_DAYS,
  env,
} from '../../../config/index.js';
import { AppError } from '../../../core/errors/index.js';
import type { Principal } from '../../../core/security/index.js';
import { smsSender } from '../../../core/sms/index.js';
import { paginate, type Paginated } from '../../../shared/types.js';
import { auditService } from '../../audit/audit.service.js';
import { usersService } from '../../users/users.service.js';
import type { CommunityDocument } from '../communities.model.js';
import { isAcceptingMembers } from '../communities.mapper.js';
import { buildInviteSms, buildInviteUrl } from '../joinCode.js';
import { invitesRepository } from './invite.repository.js';
import type { InviteDocument } from './invite.model.js';
import type {
  InviteDto,
  InvitePreviewDto,
  ListInvitesFilter,
  SentInviteDto,
} from './invite.types.js';

const HOUR_MS = 60 * 60 * 1000;

/** 32 bytes, URL-safe. Long enough that guessing is not a strategy. */
const generateToken = (): string => randomBytes(32).toString('base64url');

/** Stored instead of the token, for the same reason refresh tokens are hashed. */
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * `+919876543210` → `••••••3210`.
 *
 * A leader needs to recognise which invite is which; nobody needs the whole
 * number rendered into a browser tab, a screenshot or a support ticket.
 */
function maskPhone(phone: string): string {
  const last4 = phone.slice(-4);
  return `••••••${last4}`;
}

const isUsable = (doc: InviteDocument): boolean =>
  doc.status === 'SENT' && doc.expiresAt.getTime() > Date.now();

function toInviteDto(doc: InviteDocument, communityName: string): InviteDto {
  return {
    id: doc._id.toString(),
    communityId: doc.communityId.toString(),
    communityName,
    phoneMasked: maskPhone(doc.phone),
    status: doc.status,
    isUsable: isUsable(doc),
    smsDelivered: doc.smsDelivered,
    invitedBy: doc.invitedBy.toString(),
    acceptedBy: doc.acceptedBy?.toString() ?? null,
    acceptedAt: doc.acceptedAt?.toISOString() ?? null,
    expiresAt: doc.expiresAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

/** WhatsApp fallback, which is how most of these will actually travel today. */
function whatsAppForInvite(phone: string, communityName: string, inviteUrl: string): string {
  const text = [
    `🙏 ${communityName} में आपका स्वागत है।`,
    '',
    'जुड़ने के लिए इस लिंक पर टैप करें:',
    inviteUrl,
  ].join('\n');

  // `wa.me/<number>` opens the chat with that specific person already selected,
  // which removes the one step a leader is most likely to fumble.
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

export const invitesService = {
  /**
   * Issues an invite for one phone number and attempts to text it.
   *
   * Returns the raw link regardless of whether the SMS went out, because it
   * currently never does — see `core/sms`. The leader forwards it on WhatsApp,
   * which is both the honest interim behaviour and, realistically, the channel
   * most invites will use even after a provider is connected.
   */
  async send(
    actor: Principal,
    community: CommunityDocument,
    phone: string,
    ip?: string,
  ): Promise<SentInviteDto> {
    if (!isAcceptingMembers(community)) {
      throw AppError.conflict('This community is not accepting new members right now', {
        messageHi: 'यह समुदाय अभी नए सदस्य नहीं ले रहा है।',
      });
    }

    const communityId = community._id.toString();

    // Someone who already belongs here does not need an invite, and sending one
    // produces a link that can only ever fail.
    const existingUser = await usersService.findByPhone(phone);
    if (existingUser?.communityId?.toString() === communityId) {
      throw AppError.conflict('This person is already a member of this community', {
        messageHi: 'यह व्यक्ति पहले से इस समुदाय का सदस्य है।',
      });
    }

    const sentInLastHour = await invitesRepository.countSince(
      communityId,
      new Date(Date.now() - HOUR_MS),
    );
    if (sentInLastHour >= INVITE_MAX_PER_COMMUNITY_PER_HOUR) {
      throw AppError.rateLimited(
        `Only ${String(INVITE_MAX_PER_COMMUNITY_PER_HOUR)} invites can be sent per hour`,
        { messageHi: 'एक घंटे में इससे अधिक निमंत्रण नहीं भेजे जा सकते।' },
      );
    }

    // Re-inviting the same number replaces the old link rather than leaving two
    // live: a member with two links will tap the wrong one.
    const existingInvite = await invitesRepository.findUsableForPhone(communityId, phone);
    if (existingInvite) await invitesRepository.revoke(existingInvite._id.toString());

    const token = generateToken();
    const inviteUrl = buildInviteUrl(token);

    const smsResult = await smsSender.send({
      to: phone,
      body: buildInviteSms(community.name, inviteUrl),
      templateKey: 'COMMUNITY_INVITE',
    });

    const invite = await invitesRepository.create({
      communityId,
      phone,
      tokenHash: hashToken(token),
      invitedBy: actor.userId,
      smsDelivered: smsResult.delivered,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * HOUR_MS),
    });

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'COMMUNITY_INVITE_SENT',
      resourceType: 'COMMUNITY',
      resourceId: communityId,
      communityId,
      // Neither the number nor the token is written to the trail: the audit log
      // is read by more people than may hold a key to this community.
      summary: `Invited ${maskPhone(phone)} to "${community.name}"`,
      metadata: { smsDelivered: smsResult.delivered, replacedPrevious: existingInvite !== null },
      ip: ip ?? null,
    });

    return {
      invite: toInviteDto(invite, community.name),
      inviteUrl,
      whatsAppUrl: whatsAppForInvite(phone, community.name, inviteUrl),
      smsDelivered: smsResult.delivered,
    };
  },

  async list(
    community: CommunityDocument,
    filter: Omit<ListInvitesFilter, 'communityId'>,
  ): Promise<Paginated<InviteDto>> {
    const communityId = community._id.toString();
    const { items, total } = await invitesRepository.list({ ...filter, communityId });

    return paginate(
      items.map((doc) => toInviteDto(doc, community.name)),
      total,
      filter.page,
      filter.pageSize,
    );
  },

  async revoke(
    actor: Principal,
    community: CommunityDocument,
    inviteId: string,
    ip?: string,
  ): Promise<InviteDto> {
    const communityId = community._id.toString();
    const existing = await invitesRepository.findById(inviteId);

    // Scope the lookup to the community the caller was authorised against, or a
    // leader could revoke another community's invite by guessing an id.
    if (!existing || existing.communityId.toString() !== communityId) {
      throw AppError.notFound('Invite not found');
    }

    const revoked = await invitesRepository.revoke(inviteId);
    if (!revoked) {
      throw AppError.conflict('This invite has already been used or cancelled');
    }

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'COMMUNITY_INVITE_REVOKED',
      resourceType: 'COMMUNITY',
      resourceId: communityId,
      communityId,
      summary: `Cancelled the invite to ${maskPhone(revoked.phone)}`,
      ip: ip ?? null,
    });

    return toInviteDto(revoked, community.name);
  },

  /**
   * Resolves a token for the "you have been invited to X" screen.
   *
   * Always answers with a *reason* rather than a bare 404, because "this link has
   * expired, ask for a new one" is actionable and "not found" makes someone
   * assume they broke something.
   */
  async preview(
    token: string,
    loadCommunity: (id: string) => Promise<CommunityDocument | null>,
  ): Promise<InvitePreviewDto> {
    const invite = await invitesRepository.findByTokenHash(hashToken(token));

    if (!invite) {
      throw AppError.notFound('This invite link is not valid', {
        messageHi: 'यह निमंत्रण लिंक मान्य नहीं है।',
        details: { problem: 'NOT_FOUND' },
      });
    }

    const community = await loadCommunity(invite.communityId.toString());
    if (!community) {
      throw AppError.notFound('This community is no longer available', {
        messageHi: 'यह समुदाय अब उपलब्ध नहीं है।',
        details: { problem: 'COMMUNITY_UNAVAILABLE' },
      });
    }

    const problem: InvitePreviewDto['problem'] =
      invite.status === 'ACCEPTED'
        ? 'USED'
        : invite.status === 'REVOKED'
          ? 'REVOKED'
          : invite.expiresAt.getTime() <= Date.now()
            ? 'EXPIRED'
            : !isAcceptingMembers(community)
              ? 'COMMUNITY_UNAVAILABLE'
              : null;

    return {
      communityId: community._id.toString(),
      communityName: community.name,
      communityDescription: community.description,
      memberCount: community.memberCount,
      problem,
    };
  },

  /**
   * Consumes a token. Returns the community id the caller should be attached to,
   * or throws with an actionable reason.
   *
   * Deliberately does *not* attach the member itself — that write belongs to the
   * communities service, which owns the counter and the audit entry for joining.
   */
  async consume(token: string, userId: string): Promise<string> {
    const invite = await invitesRepository.findByTokenHash(hashToken(token));

    if (!invite) {
      throw AppError.notFound('This invite link is not valid', {
        messageHi: 'यह निमंत्रण लिंक मान्य नहीं है।',
      });
    }

    if (invite.status === 'ACCEPTED') {
      throw AppError.conflict('This invite has already been used', {
        messageHi: 'यह निमंत्रण पहले ही उपयोग हो चुका है।',
      });
    }
    if (invite.status === 'REVOKED') {
      throw AppError.conflict('This invite was cancelled', {
        messageHi: 'यह निमंत्रण रद्द कर दिया गया था।',
      });
    }
    if (invite.expiresAt.getTime() <= Date.now()) {
      throw AppError.conflict('This invite has expired. Ask for a new one.', {
        messageHi: 'यह निमंत्रण समाप्त हो गया है। कृपया नया निमंत्रण माँगें।',
      });
    }

    const accepted = await invitesRepository.markAccepted(invite._id.toString(), userId);
    if (!accepted) {
      // The conditional update lost a race with another tap of the same link.
      throw AppError.conflict('This invite has already been used', {
        messageHi: 'यह निमंत्रण पहले ही उपयोग हो चुका है।',
      });
    }

    return accepted.communityId.toString();
  },

  /** Called when a community is archived, so no live link outlives it. */
  revokeAllForCommunity(communityId: string): Promise<number> {
    return invitesRepository.revokeAllForCommunity(communityId);
  },

  /** Whether SMS actually leaves the building; drives "not sent" copy in the UI. */
  get isSmsLive(): boolean {
    return smsSender.isLive;
  },

  /** Surfaced so the console can explain the expiry without hardcoding it. */
  get ttlDays(): number {
    return INVITE_TTL_DAYS;
  },

  /** Used by the invite preview page to build an app deep link. */
  get deepLinkScheme(): string {
    return env.MOBILE_DEEP_LINK_SCHEME;
  },
};
