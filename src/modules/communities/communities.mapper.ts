import type { CommunityDocument } from './communities.model.js';
import type {
  CommunityDto,
  CommunityLocation,
  CommunityPreviewDto,
  JoinKitDto,
} from './communities.types.js';
import {
  buildDeepLink,
  buildJoinQrDataUrl,
  buildJoinQrPngDataUrl,
  buildJoinUrl,
  buildShareMessage,
  buildWhatsAppShareUrl,
  splitCodeWords,
  toHindiCode,
} from './joinCode.js';

const toIso = (value: Date | null | undefined): string | null => value?.toISOString() ?? null;

function toLocation(doc: CommunityDocument): CommunityLocation {
  return {
    state: doc.location?.state ?? null,
    district: doc.location?.district ?? null,
    city: doc.location?.city ?? null,
    pincode: doc.location?.pincode ?? null,
  };
}

/**
 * The single question "can someone join this right now?", answered in one place.
 *
 * Two independent switches have to agree: staff approval (`status`) and the
 * community's own recruitment toggle (`isJoinable`). Duplicating this expression
 * at the call sites is how one of them eventually gets forgotten.
 */
export function isAcceptingMembers(doc: CommunityDocument): boolean {
  return doc.status === 'ACTIVE' && doc.isJoinable;
}

/** The full record. Staff-facing, and the leader's view of their own community. */
export function toCommunityDto(doc: CommunityDocument): CommunityDto {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    type: doc.type,
    status: doc.status,

    joinCode: doc.joinCode,
    joinCodeHindi: toHindiCode(doc.joinCode),
    joinCodeWords: splitCodeWords(doc.joinCode),
    joinCodeIsCustom: doc.joinCodeIsCustom,
    joinCodeUpdatedAt: doc.joinCodeUpdatedAt.toISOString(),

    leaderId: doc.leaderId?.toString() ?? null,
    createdBy: doc.createdBy.toString(),
    approvedBy: doc.approvedBy?.toString() ?? null,
    approvedAt: toIso(doc.approvedAt),
    rejectionReason: doc.rejectionReason,

    memberCount: doc.memberCount,
    isJoinable: doc.isJoinable,
    isAcceptingMembers: isAcceptingMembers(doc),

    location: toLocation(doc),
    contactEmail: doc.contactEmail,
    contactPhone: doc.contactPhone,

    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * What someone holding a code sees before they commit.
 *
 * Built by enumeration from a narrow field list rather than by omitting fields
 * from `CommunityDto`: adding a sensitive field to the full DTO later must not
 * silently leak it to unauthenticated-adjacent callers.
 */
export function toCommunityPreviewDto(
  doc: CommunityDocument,
  unavailableReason: CommunityPreviewDto['unavailableReason'],
): CommunityPreviewDto {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    type: doc.type,
    location: toLocation(doc),
    isAcceptingMembers: isAcceptingMembers(doc),
    joinCode: doc.joinCode,
    joinCodeHindi: toHindiCode(doc.joinCode),
    // A rough sense of scale reassures someone that they found the right place.
    // Exact enough to be useful, and not private: the leader prints it on posters.
    memberCount: doc.memberCount,
    unavailableReason,
  };
}

/**
 * The share bundle. The QR is rendered on demand rather than stored: it is a pure
 * function of the code, and caching it would mean a rotated code could keep
 * handing out a QR that points at the old one.
 */
export function toJoinKitDto(doc: CommunityDocument): JoinKitDto {
  const code = doc.joinCode;
  return {
    communityId: doc._id.toString(),
    communityName: doc.name,
    joinCode: code,
    joinCodeHindi: toHindiCode(code),
    joinCodeWords: splitCodeWords(code),
    joinCodeIsCustom: doc.joinCodeIsCustom,
    joinUrl: buildJoinUrl(code),
    deepLink: buildDeepLink(code),
    qrDataUrl: buildJoinQrDataUrl(code, doc.name),
    qrPngDataUrl: buildJoinQrPngDataUrl(code),
    shareMessage: buildShareMessage(doc.name, code),
    whatsAppUrl: buildWhatsAppShareUrl(doc.name, code),
  };
}
