import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../shared/schemas.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from './audit.types.js';

/** `YYYY-MM-DD` or a full ISO timestamp; both are coerced to a `Date`. */
const isoDateSchema = z.coerce.date();

export const listAuditSchema = paginationSchema
  .extend({
    action: z.enum(AUDIT_ACTIONS).optional(),
    resourceType: z.enum(AUDIT_RESOURCE_TYPES).optional(),
    resourceId: objectIdSchema.optional(),
    actorId: objectIdSchema.optional(),
    communityId: objectIdSchema.optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((v) => !v.from || !v.to || v.from < v.to, {
    message: '`from` must be earlier than `to`',
    path: ['from'],
  });

export type ListAuditQuery = z.infer<typeof listAuditSchema>;
