import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler, sendSuccess } from '../../core/http/index.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from './audit.types.js';
import type { ListAuditQuery } from './audit.schema.js';

export const auditController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListAuditQuery;
    sendSuccess(res, await auditService.list(query));
  }),

  /**
   * The closed vocabularies, so the console can build its filter dropdowns from
   * the server rather than keeping a second copy of the list in sync by hand.
   */
  vocabulary: (_req: Request, res: Response): void => {
    sendSuccess(res, { actions: AUDIT_ACTIONS, resourceTypes: AUDIT_RESOURCE_TYPES });
  },
} satisfies Record<string, RequestHandler>;
