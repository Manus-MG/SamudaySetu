export { communityRoutes } from './communities.routes.js';
export { communitiesService } from './communities.service.js';
export type { ModerationAction } from './communities.service.js';

export { toCommunityDto, toJoinKitDto, isAcceptingMembers } from './communities.mapper.js';

export {
  buildDeepLink,
  buildJoinUrl,
  formatJoinCode,
  generateJoinCode,
  isWellFormedJoinCode,
  normaliseJoinCode,
} from './joinCode.js';

export { COMMUNITY_STATUSES, COMMUNITY_TYPES, LIVE_COMMUNITY_STATUSES } from './communities.types.js';
export type {
  CommunityDto,
  CommunityPreviewDto,
  CommunityStatus,
  CommunityType,
  JoinKitDto,
} from './communities.types.js';
