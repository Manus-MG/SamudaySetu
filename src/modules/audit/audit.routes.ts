import { Router } from 'express';
import { requirePermission, validate } from '../../core/middleware/index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { auditController } from './audit.controller.js';
import { listAuditSchema } from './audit.schema.js';

/** Mounted at `/api/v1/audit`. Read-only by construction — there is no write route. */
export const auditRoutes: Router = Router();

auditRoutes.use(authenticate);

auditRoutes.get('/vocabulary', requirePermission('audit:read'), auditController.vocabulary);

auditRoutes.get(
  '/',
  requirePermission('audit:read'),
  validate({ query: listAuditSchema }),
  auditController.list,
);
