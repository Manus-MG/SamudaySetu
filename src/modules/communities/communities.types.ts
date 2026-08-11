/**
 * A community is the tenant boundary of the product. Everything a member ever
 * sees is scoped to one, so the lifecycle below is the security model, not just
 * bookkeeping.
 *
 * `PENDING_APPROVAL` → a leader proposed it; it has a join code but nobody can
 *   join yet, because an unapproved community must not be able to recruit.
 * `ACTIVE`           → approved and running.
 * `REJECTED`         → refused with a reason; terminal, the leader must start over.
 * `SUSPENDED`        → temporarily frozen by staff. Existing members keep their
 *   membership; joining stops. Reversible.
 * `ARCHIVED`         → soft delete. Members are detached and the join code is
 *   released so it can never resolve to a dead community.
 */
export const COMMUNITY_STATUSES = [
  'PENDING_APPROVAL',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
  'ARCHIVED',
] as const;

export type CommunityStatus = (typeof COMMUNITY_STATUSES)[number];

/** Statuses in which a community still occupies its leader's single-community slot. */
export const LIVE_COMMUNITY_STATUSES: readonly CommunityStatus[] = [
  'PENDING_APPROVAL',
  'ACTIVE',
  'SUSPENDED',
];

/**
 * The kind of organisation, which drives copy, defaults and later the hierarchy
 * template. Kept as a small closed set: these are categories, not the tenant's
 * own vocabulary for itself.
 */
export const COMMUNITY_TYPES = [
  'SAMAJ',
  'POLITICAL',
  'RWA',
  'ALUMNI',
  'NGO',
  'TRADE_BODY',
  'OTHER',
] as const;

export type CommunityType = (typeof COMMUNITY_TYPES)[number];

export interface CommunityLocationInput {
  state?: string;
  district?: string;
  city?: string;
  pincode?: string;
}

export interface CommunityLocation {
  state: string | null;
  district: string | null;
  city: string | null;
  pincode: string | null;
}

/** A community as the API exposes it. Never contains anything member-private. */
export interface CommunityDto {
  id: string;
  name: string;
  description: string | null;
  type: CommunityType;
  status: CommunityStatus;

  /** Display form with word boundaries: `SURAJ-KAMAL`. */
  joinCode: string;
  /** `सूरज-कमल`, or `null` for a custom code we cannot transliterate safely. */
  joinCodeHindi: string | null;
  /** The words on their own, for a UI that shows them one per line. */
  joinCodeWords: string[];
  /** True when the leader chose it rather than the wordlist generating it. */
  joinCodeIsCustom: boolean;
  joinCodeUpdatedAt: string;

  leaderId: string | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;

  memberCount: number;
  /** Staff/leader switch to pause recruitment without suspending the community. */
  isJoinable: boolean;
  /** `isJoinable` **and** `status === 'ACTIVE'`. What the join endpoint actually checks. */
  isAcceptingMembers: boolean;

  location: CommunityLocation;
  contactEmail: string | null;
  contactPhone: string | null;

  createdAt: string;
  updatedAt: string;
}

/**
 * What a prospective member sees *before* joining, from a code or a QR scan.
 *
 * Deliberately a fraction of `CommunityDto`: someone holding a code that was
 * forwarded to them is not yet a member and must not learn the leader's identity,
 * the contact details or the exact member count.
 */
export interface CommunityPreviewDto {
  id: string;
  name: string;
  description: string | null;
  type: CommunityType;
  location: CommunityLocation;
  isAcceptingMembers: boolean;
  /** Echoed back so the confirm screen shows the canonical code, not the typo-ish
   *  thing the member typed. Seeing `SURAJ-KAMAL` after typing `surajkamal` is
   *  what tells them the app understood. */
  joinCode: string;
  joinCodeHindi: string | null;
  memberCount: number;
  /** Why joining is unavailable, when it is. `null` when the community is open. */
  unavailableReason: 'NOT_FOUND' | 'NOT_APPROVED' | 'SUSPENDED' | 'CLOSED' | null;
}

/** Everything needed to get a member through the door, in one response. */
export interface JoinKitDto {
  communityId: string;
  communityName: string;
  joinCode: string;
  joinCodeHindi: string | null;
  joinCodeWords: string[];
  joinCodeIsCustom: boolean;
  /** Universal link. Opens the app if installed, the web page otherwise. */
  joinUrl: string;
  /** Custom-scheme fallback for platforms where universal links are unreliable. */
  deepLink: string;
  /** SVG data URL of `joinUrl`. Sharp at any size — used by the web console. */
  qrDataUrl: string;
  /** PNG data URL of the same QR, for the Flutter app's `Image.memory`. */
  qrPngDataUrl: string;
  /** Pre-written share text in Hindi, the app's default locale. */
  shareMessage: string;
  /** `wa.me` link that opens WhatsApp with `shareMessage` already composed. */
  whatsAppUrl: string;
}

/** Answer to "can we use this code?", for the admin UI's live check. */
export interface JoinCodeAvailabilityDto {
  /** The display form the server would store, so the UI can show it back. */
  code: string;
  codeHindi: string | null;
  available: boolean;
  /** `null` when available; otherwise why not, in both languages. */
  reason: string | null;
  reasonHi: string | null;
}

export interface CreateCommunityInput {
  name: string;
  description?: string;
  type: CommunityType;
  leaderId?: string;
  location?: CommunityLocationInput;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateCommunityInput {
  name?: string;
  description?: string | null;
  type?: CommunityType;
  location?: CommunityLocationInput;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isJoinable?: boolean;
}

export interface ListCommunitiesFilter {
  status?: CommunityStatus;
  type?: CommunityType;
  leaderId?: string;
  /** Matches name or join code. */
  search?: string;
  page: number;
  pageSize: number;
}
