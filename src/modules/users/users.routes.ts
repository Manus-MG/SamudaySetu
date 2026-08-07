import { Router } from 'express';
import { requirePermission, validate } from '../../core/middleware/index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { usersController } from './users.controller.js';
import {
  assignRoleSchema,
  createStaffUserSchema,
  listUsersSchema,
  updateProfileSchema,
  updateStatusSchema,
  userIdParamSchema,
} from './users.schema.js';

/** Mounted at `/api/v1/users`. Every route below requires a valid access token. */
export const userRoutes: Router = Router();

userRoutes.use(authenticate);

// ── Self-service ─────────────────────────────────────────────────────────────
// Authorised by identity, not by permission: every signed-in user owns these.
userRoutes.get('/me', usersController.me);
userRoutes.patch('/me', validate({ body: updateProfileSchema }), usersController.updateMe);

// ── Administration ───────────────────────────────────────────────────────────
// Guards ask for a capability, so changing who can do what is a one-line edit to
// the permission matrix in `core/security/roles.ts` rather than a route change.
userRoutes.get(
  '/',
  requirePermission('user:read'),
  validate({ query: listUsersSchema }),
  usersController.list,
);

userRoutes.post(
  '/',
  requirePermission('user:create'),
  validate({ body: createStaffUserSchema }),
  usersController.create,
);

userRoutes.get(
  '/:id',
  requirePermission('user:read'),
  validate({ params: userIdParamSchema }),
  usersController.getById,
);

userRoutes.patch(
  '/:id/role',
  requirePermission('user:role:assign'),
  validate({ params: userIdParamSchema, body: assignRoleSchema }),
  usersController.assignRole,
);

userRoutes.patch(
  '/:id/status',
  requirePermission('user:status:manage'),
  validate({ params: userIdParamSchema, body: updateStatusSchema }),
  usersController.setStatus,
);

userRoutes.delete(
  '/:id',
  requirePermission('user:delete'),
  validate({ params: userIdParamSchema }),
  usersController.remove,
);
