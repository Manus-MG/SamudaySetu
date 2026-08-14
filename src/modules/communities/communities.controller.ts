import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler, sendSuccess } from '../../core/http/index.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { communitiesService } from './communities.service.js';
import type {
  AcceptInviteBody,
  AssignLeaderBody,
  CheckJoinCodeQuery,
  CreateCommunityBody,
  JoinCommunityBody,
  ListCommunitiesQuery,
  ListInvitesQuery,
  ListMembersQuery,
  ModerateCommunityBody,
  SendInviteBody,
  SetJoinCodeBody,
  UpdateCommunityBody,
} from './communities.schema.js';

const idParam = (req: Request): string => req.params['id'] as string;
const codeParam = (req: Request): string => req.params['code'] as string;
const inviteIdParam = (req: Request): string => req.params['inviteId'] as string;
const tokenParam = (req: Request): string => req.params['token'] as string;

/** Client IP for the audit trail. `trust proxy` is set, so this is the real one. */
const clientIp = (req: Request): string | undefined => req.ip;

/** Filenames from user-supplied names: ASCII-safe, no path separators, no quotes. */
function toSafeFilename(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
  return `${slug.length > 0 ? slug : 'community'}-join-qr.svg`;
}

export const communitiesController = {
  // ── Staff & leader administration ──────────────────────────────────────────
  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const created = await communitiesService.create(
      actor,
      req.body as CreateCommunityBody,
      clientIp(req),
    );
    sendSuccess(res, created, 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const query = req.query as unknown as ListCommunitiesQuery;
    sendSuccess(res, await communitiesService.list(actor, query));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    sendSuccess(res, await communitiesService.getById(actor, idParam(req)));
  }),

  /**
   * The signed-in actor's own community. Not permission-gated.
   *
   * Wrapped in an object rather than returned as a bare `null`, because "no
   * community" is a normal, expected answer and every client would otherwise
   * need a special case for a `data` that is not an object.
   */
  getMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    sendSuccess(res, { community: await communitiesService.getMine(actor) });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const updated = await communitiesService.update(
      actor,
      idParam(req),
      req.body as UpdateCommunityBody,
      clientIp(req),
    );
    sendSuccess(res, updated);
  }),

  moderate: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { action, reason } = req.body as ModerateCommunityBody;
    sendSuccess(
      res,
      await communitiesService.moderate(actor, idParam(req), action, reason, clientIp(req)),
    );
  }),

  assignLeader: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { leaderId } = req.body as AssignLeaderBody;
    sendSuccess(
      res,
      await communitiesService.assignLeader(actor, idParam(req), leaderId, clientIp(req)),
    );
  }),

  removeLeader: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    sendSuccess(res, await communitiesService.removeLeader(actor, idParam(req), clientIp(req)));
  }),

  archive: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    sendSuccess(res, await communitiesService.archive(actor, idParam(req), clientIp(req)));
  }),

  listMembers: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const query = req.query as unknown as ListMembersQuery;
    sendSuccess(res, await communitiesService.listMembers(actor, idParam(req), query));
  }),

  reconcileMemberCount: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    sendSuccess(res, await communitiesService.reconcileMemberCount(actor, idParam(req)));
  }),

  // ── Sharing ────────────────────────────────────────────────────────────────
  getJoinKit: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    sendSuccess(res, await communitiesService.getJoinKit(actor, idParam(req)));
  }),

  /** The caller's own share bundle. Members and leaders alike. */
  getMyJoinKit: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    sendSuccess(res, { joinKit: await communitiesService.getMyJoinKit(actor) });
  }),

  rotateJoinCode: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    sendSuccess(res, await communitiesService.rotateJoinCode(actor, idParam(req), clientIp(req)));
  }),

  /** Live availability check, called as the leader types a custom code. */
  checkJoinCode: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { code } = req.query as unknown as CheckJoinCodeQuery;
    sendSuccess(res, await communitiesService.checkJoinCode(actor, idParam(req), code));
  }),

  setJoinCode: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { code } = req.body as SetJoinCodeBody;
    sendSuccess(
      res,
      await communitiesService.setCustomJoinCode(actor, idParam(req), code, clientIp(req)),
    );
  }),

  // ── Invites ────────────────────────────────────────────────────────────────
  sendInvite: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { phone } = req.body as SendInviteBody;
    const sent = await communitiesService.sendInvite(actor, idParam(req), phone, clientIp(req));
    sendSuccess(res, sent, 201);
  }),

  listInvites: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const query = req.query as unknown as ListInvitesQuery;
    sendSuccess(res, await communitiesService.listInvites(actor, idParam(req), query));
  }),

  revokeInvite: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    sendSuccess(
      res,
      await communitiesService.revokeInvite(actor, idParam(req), inviteIdParam(req), clientIp(req)),
    );
  }),

  previewInvite: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await communitiesService.previewInvite(tokenParam(req)));
  }),

  acceptInvite: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { token } = req.body as AcceptInviteBody;
    sendSuccess(res, await communitiesService.joinByInvite(actor, token, clientIp(req)));
  }),

  /**
   * The QR as a real SVG document rather than inside the JSON envelope, so it can
   * be saved, emailed and dropped into a print layout directly.
   *
   * `no-store`: the code behind it is rotatable, and a cached QR that still points
   * at a revoked code is precisely the failure rotation exists to prevent.
   */
  getJoinQrSvg: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { svg, name } = await communitiesService.getJoinQrSvg(actor, idParam(req));

    res.type('image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `inline; filename="${toSafeFilename(name)}"`);
    res.send(svg);
  }),

  // ── The member-facing path ─────────────────────────────────────────────────
  previewByCode: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await communitiesService.previewByCode(codeParam(req)));
  }),

  join: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { code } = req.body as JoinCommunityBody;
    sendSuccess(res, await communitiesService.joinByCode(actor, code, clientIp(req)));
  }),

  leave: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    sendSuccess(res, await communitiesService.leave(actor, clientIp(req)));
  }),
} satisfies Record<string, RequestHandler>;
