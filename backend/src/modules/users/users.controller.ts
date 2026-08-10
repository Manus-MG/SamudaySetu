import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler, sendSuccess } from '../../core/http/index.js';
// Imported by file rather than through the module barrel: `auth/index.ts` pulls in
// `auth.service`, which imports this module, and that would be an import cycle.
// `token.service` deliberately depends on nothing outside `core`.
import { tokenService } from '../auth/token.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { auditService } from '../audit/audit.service.js';
import { usersService } from './users.service.js';
import type {
  AssignRoleBody,
  CreateStaffUserBody,
  ListUsersQuery,
  UpdateProfileBody,
  UpdateStatusBody,
} from './users.schema.js';

const idParam = (req: Request): string => req.params['id'] as string;

/** Client IP for the audit trail. `trust proxy` is set, so this is the real one. */
const clientIp = (req: Request): string | undefined => req.ip;

export const usersController = {
  // ── Self ───────────────────────────────────────────────────────────────────
  me: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = requireAuth(req);
    sendSuccess(res, await usersService.getById(userId));
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = requireAuth(req);
    sendSuccess(res, await usersService.updateProfile(userId, req.body as UpdateProfileBody));
  }),

  // ── Administration ─────────────────────────────────────────────────────────
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListUsersQuery;
    sendSuccess(res, await usersService.list(query));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await usersService.getById(idParam(req)));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const created = await usersService.createStaffUser(actor, req.body as CreateStaffUserBody);

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'USER_CREATED',
      resourceType: 'USER',
      resourceId: created.id,
      summary: `Created ${created.role} account for ${created.email ?? created.id}`,
      metadata: { role: created.role },
      ip: clientIp(req),
    });

    sendSuccess(res, created, 201);
  }),

  assignRole: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { role } = req.body as AssignRoleBody;
    const updated = await usersService.assignRole(actor, idParam(req), role);

    // A role change must not leave the old level live on an existing session.
    await tokenService.revokeAllForUser(updated.id, 'ADMIN_REVOKED');

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'USER_ROLE_ASSIGNED',
      resourceType: 'USER',
      resourceId: updated.id,
      summary: `Set role of ${updated.fullName ?? updated.email ?? updated.id} to ${role}`,
      metadata: { role },
      ip: clientIp(req),
    });

    sendSuccess(res, updated);
  }),

  setStatus: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { status } = req.body as UpdateStatusBody;
    const updated = await usersService.setStatus(actor, idParam(req), status);

    if (status === 'SUSPENDED') {
      await tokenService.revokeAllForUser(updated.id, 'ACCOUNT_DISABLED');
    }

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'USER_STATUS_CHANGED',
      resourceType: 'USER',
      resourceId: updated.id,
      summary: `Set ${updated.fullName ?? updated.email ?? updated.id} to ${status}`,
      metadata: { status },
      ip: clientIp(req),
    });

    sendSuccess(res, updated);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const deleted = await usersService.remove(actor, idParam(req));
    await tokenService.revokeAllForUser(deleted.id, 'ACCOUNT_DISABLED');

    void auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'USER_DELETED',
      resourceType: 'USER',
      resourceId: deleted.id,
      // The DTO's PII is already erased at this point, so the id is all there is.
      summary: `Deleted account ${deleted.id}`,
      ip: clientIp(req),
    });

    sendSuccess(res, deleted);
  }),
} satisfies Record<string, RequestHandler>;
