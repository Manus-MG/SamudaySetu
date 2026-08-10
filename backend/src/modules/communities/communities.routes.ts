import { Router } from 'express';
import { createRateLimiter, requirePermission, validate } from '../../core/middleware/index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { communitiesController } from './communities.controller.js';
import {
  assignLeaderSchema,
  communityIdParamSchema,
  createCommunitySchema,
  joinCodeParamSchema,
  joinCommunitySchema,
  listCommunitiesSchema,
  listMembersSchema,
  moderateCommunitySchema,
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
