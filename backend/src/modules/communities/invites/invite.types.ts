/**
 * A one-tap invite addressed to a single phone number.
 *
 * This is the shortest possible path into a community for the audience the
 * product actually has: no code to hear correctly, no code to type, no camera to
 * aim. The leader enters a number they already have, the member taps a link.
 *
 * `SENT` → issued and live.
 * `ACCEPTED` → used; terminal, and the token stops working.
 * `REVOKED` → cancelled by the leader; terminal.
 * Expiry is a function of `expiresAt`, not a stored status, so a clock change can
 * never strand a row in the wrong state.
 */
export const INVITE_STATUSES = ['SENT', 'ACCEPTED', 'REVOKED'] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export interface InviteDto {
  id: string;
  communityId: string;
  communityName: string;
  /** Masked to the last four digits — see `maskPhone`. */
  phoneMasked: string;
  status: InviteStatus;
  /** Derived: `SENT` and not past `expiresAt`. */
  isUsable: boolean;
  /** Whether the SMS actually left the building. False until a provider exists. */
  smsDelivered: boolean;
  invitedBy: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

/**
 * The response to sending an invite.
 *
 * `inviteUrl` is returned in the clear because no SMS provider is wired up yet:
 * the leader needs *something* to forward on WhatsApp, or the feature is inert.
 * It is only ever handed to the staff member who created it, never to a third
 * party, and it is single-use.
 */
export interface SentInviteDto {
  invite: InviteDto;
  inviteUrl: string;
  /** `wa.me` link with a ready-written message, for one-tap forwarding. */
  whatsAppUrl: string;
  /** True once a real provider is configured; false means "you must forward it". */
  smsDelivered: boolean;
}

/** What the member sees after tapping the link, before committing. */
export interface InvitePreviewDto {
  communityId: string;
  communityName: string;
  communityDescription: string | null;
  memberCount: number;
  /** `EXPIRED` / `USED` / `REVOKED` explain a dead link in words the app can show. */
  problem: 'NOT_FOUND' | 'EXPIRED' | 'USED' | 'REVOKED' | 'COMMUNITY_UNAVAILABLE' | null;
}

export interface ListInvitesFilter {
  communityId: string;
  status?: InviteStatus;
  page: number;
  pageSize: number;
}
