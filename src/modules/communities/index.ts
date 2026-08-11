export { communityRoutes } from './communities.routes.js';
export { communitiesService } from './communities.service.js';
export type { ModerationAction } from './communities.service.js';

export { toCommunityDto, toJoinKitDto, isAcceptingMembers } from './communities.mapper.js';

export {
  buildDeepLink,
  buildInviteUrl,
  buildJoinUrl,
  buildShareMessage,
  buildWhatsAppShareUrl,
  checkCustomJoinCode,
  generateJoinCode,
  normaliseJoinCode,
  splitCodeWords,
  toDisplayCode,
  toHindiCode,
} from './joinCode.js';
export type { CustomCodeCheck, CustomCodeProblem } from './joinCode.js';

export { JOIN_WORDS, JOIN_WORD_PAIR_SPACE, toDevanagariCode } from './joinWords.js';
export type { JoinWord } from './joinWords.js';

export { COMMUNITY_STATUSES, COMMUNITY_TYPES, LIVE_COMMUNITY_STATUSES } from './communities.types.js';
export type {
  CommunityDto,
  CommunityPreviewDto,
  CommunityStatus,
  CommunityType,
  JoinCodeAvailabilityDto,
  JoinKitDto,
} from './communities.types.js';

export { invitesService } from './invites/invite.service.js';
export { INVITE_STATUSES } from './invites/invite.types.js';
export type { InviteDto, InvitePreviewDto, InviteStatus, SentInviteDto } from './invites/invite.types.js';
