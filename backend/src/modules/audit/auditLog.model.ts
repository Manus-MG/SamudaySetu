import { Schema, model, type Model, type Types } from 'mongoose';
import { COLLECTIONS } from '../../config/index.js';
import { ROLES, type Role } from '../../core/security/index.js';
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCE_TYPES,
  type AuditAction,
  type AuditResourceType,
} from './audit.types.js';

export interface AuditLogDocument {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  /** Snapshotted, not joined: the answer to "what could they do at the time". */
  actorRole: Role;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: Types.ObjectId;
  communityId: Types.ObjectId | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  requestId: string | null;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorRole: { type: String, enum: ROLES, required: true },

    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    resourceType: { type: String, enum: AUDIT_RESOURCE_TYPES, required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', default: null },

    summary: { type: String, required: true, trim: true, maxlength: 300 },
    metadata: { type: Schema.Types.Mixed, default: null },

    ip: { type: String, default: null },
    requestId: { type: String, default: null },
  },
  {
    // No `updatedAt`: an audit row that can be updated is not an audit row.
    timestamps: { createdAt: true, updatedAt: false },
    collection: COLLECTIONS.AUDIT_LOGS,
    id: false,
    minimize: false,
  },
);

/**
 * Append-only, enforced at the ODM layer rather than by convention.
 *
 * The repository exposes no mutating methods, but a future contributor reaching
 * for `AuditLogModel.updateOne` directly is exactly the mistake worth making
 * loud. Database-level enforcement still belongs in the deployment (a role
 * without `update`/`remove` on this collection); this is the second line.
 */
const MUTATION_HOOKS = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
] as const;

for (const hook of MUTATION_HOOKS) {
  auditLogSchema.pre(hook, function blockMutation(): never {
    throw new Error(`Audit logs are append-only; "${hook}" is not permitted`);
  });
}

// The console's default view: newest first, optionally narrowed by one facet.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ communityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });

export const AuditLogModel: Model<AuditLogDocument> = model<AuditLogDocument>(
  'AuditLog',
  auditLogSchema,
);
