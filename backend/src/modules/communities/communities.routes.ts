import { Router } from 'express';
import { createRateLimiter, requirePermission, validate } from '../../core/middleware/index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { communitiesController } from './communities.controller.js';
import {
  acceptInviteSchema,
  assignLeaderSchema,
  checkJoinCodeSchema,
  communityIdParamSchema,
  createCommunitySchema,
  inviteIdParamSchema,
  inviteTokenParamSchema,
  joinCodeParamSchema,
  joinCommunitySchema,
  listCommunitiesSchema,
  listInvitesSchema,
  listMembersSchema,
  moderateCommunitySchema,
  sendInviteSchema,
  setJoinCodeSchema,
  updateCommunitySchema,
} from './communities.schema.js';

/**
 * Mounted at `/api/v1/communities`. Every route requires a valid access token.
 *
 * Two authorisation layers are in play and both matter:
 *   1. `requirePermission` — may this *role* ever perform this verb?
 *   2. the service's `assertMayManage` — on *this* community?
 *
 * A leader passes (1) for read/update/code routes and is then narrowed by (2) to
 * the single community they run.
 */
export const communityRoutes: Router = Router();

communityRoutes.use(authenticate);

/**
 * Code lookup and join are the only routes an attacker can brute-force for
 * something valuable — a valid code is a membership. The global limiter is far
 * too generous for that, so these get their own bucket.
 */
const joinRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 12,
  message: 'Too many attempts. Wait a minute and try again.',
});

// ── Self-service (authorised by identity, not permission) ────────────────────

communityRoutes.get('/mine', communitiesController.getMine);

/**
 * Declared before `/:id/join-kit`, and the order is load-bearing: Express matches
 * in registration order, so the parameterised route further down would otherwise
 * capture `mine` as an id and reject it as a malformed ObjectId.
 */
communityRoutes.get('/mine/join-kit', communitiesController.getMyJoinKit);

communityRoutes.get(
  '/lookup/:code',
  joinRateLimiter,
  validate({ params: joinCodeParamSchema }),
  communitiesController.previewByCode,
);

communityRoutes.post(
  '/join',
  joinRateLimiter,
  validate({ body: joinCommunitySchema }),
  communitiesController.join,
);

communityRoutes.post('/leave', communitiesController.leave);

/**
 * Invite links. `preview` is rate limited alongside the code paths — the token is
 * long enough that guessing is hopeless, but a cheap endpoint that hits the
 * database on every call still deserves a bucket.
 */
communityRoutes.get(
  '/invites/:token',
  joinRateLimiter,
  validate({ params: inviteTokenParamSchema }),
  communitiesController.previewInvite,
);

communityRoutes.post(
  '/invites/accept',
  joinRateLimiter,
  validate({ body: acceptInviteSchema }),
  communitiesController.acceptInvite,
);

// ── Administration ───────────────────────────────────────────────────────────

communityRoutes.get(
  '/',
  requirePermission('community:read'),
  validate({ query: listCommunitiesSchema }),
  communitiesController.list,
);

communityRoutes.post(
  '/',
  requirePermission('community:create'),
  validate({ body: createCommunitySchema }),
  communitiesController.create,
);

communityRoutes.get(
  '/:id',
  requirePermission('community:read'),
  validate({ params: communityIdParamSchema }),
  communitiesController.getById,
);

communityRoutes.patch(
  '/:id',
  requirePermission('community:update'),
  validate({ params: communityIdParamSchema, body: updateCommunitySchema }),
  communitiesController.update,
);

communityRoutes.patch(
  '/:id/moderation',
  requirePermission('community:moderate'),
  validate({ params: communityIdParamSchema, body: moderateCommunitySchema }),
  communitiesController.moderate,
);

communityRoutes.patch(
  '/:id/leader',
  requirePermission('community:leader:assign'),
  validate({ params: communityIdParamSchema, body: assignLeaderSchema }),
  communitiesController.assignLeader,
);

communityRoutes.delete(
  '/:id/leader',
  requirePermission('community:leader:assign'),
  validate({ params: communityIdParamSchema }),
  communitiesController.removeLeader,
);

communityRoutes.delete(
  '/:id',
  requirePermission('community:delete'),
  validate({ params: communityIdParamSchema }),
  communitiesController.archive,
);

// ── Members ──────────────────────────────────────────────────────────────────

communityRoutes.get(
  '/:id/members',
  requirePermission('community:read'),
  validate({ params: communityIdParamSchema, query: listMembersSchema }),
  communitiesController.listMembers,
);

communityRoutes.post(
  '/:id/members/reconcile',
  requirePermission('community:update'),
  validate({ params: communityIdParamSchema }),
  communitiesController.reconcileMemberCount,
);

// ── Sharing ──────────────────────────────────────────────────────────────────

communityRoutes.get(
  '/:id/join-kit',
  requirePermission('community:read'),
  validate({ params: communityIdParamSchema }),
  communitiesController.getJoinKit,
);

communityRoutes.get(
  '/:id/join-qr.svg',
  requirePermission('community:read'),
  validate({ params: communityIdParamSchema }),
  communitiesController.getJoinQrSvg,
);

communityRoutes.post(
  '/:id/join-code/rotate',
  requirePermission('community:code:manage'),
  validate({ params: communityIdParamSchema }),
  communitiesController.rotateJoinCode,
);

// Called on every keystroke in the admin's code editor, so it is a GET with no
// side effects and returns a reason rather than an error status.
communityRoutes.get(
  '/:id/join-code/check',
  requirePermission('community:code:manage'),
  validate({ params: communityIdParamSchema, query: checkJoinCodeSchema }),
  communitiesController.checkJoinCode,
);

communityRoutes.put(
  '/:id/join-code',
  requirePermission('community:code:manage'),
  validate({ params: communityIdParamSchema, body: setJoinCodeSchema }),
  communitiesController.setJoinCode,
);

// ── Invites, from the leader's side ──────────────────────────────────────────

communityRoutes.get(
  '/:id/invites',
  requirePermission('community:read'),
  validate({ params: communityIdParamSchema, query: listInvitesSchema }),
  communitiesController.listInvites,
);

communityRoutes.post(
  '/:id/invites',
  requirePermission('community:code:manage'),
  validate({ params: communityIdParamSchema, body: sendInviteSchema }),
  communitiesController.sendInvite,
);

communityRoutes.delete(
  '/:id/invites/:inviteId',
  requirePermission('community:code:manage'),
  validate({ params: inviteIdParamSchema }),
  communitiesController.revokeInvite,
);
