import { Types, type FilterQuery } from 'mongoose';
import { AuditLogModel, type AuditLogDocument } from './auditLog.model.js';
import type { ListAuditFilter, RecordAuditInput } from './audit.types.js';

/**
 * The only place `audit_logs` is touched. There is deliberately no update and no
 * delete method — see the append-only hooks on the model.
 */
function buildQuery(filter: ListAuditFilter): FilterQuery<AuditLogDocument> {
  const query: FilterQuery<AuditLogDocument> = {};

  if (filter.action) query.action = filter.action;
  if (filter.resourceType) query.resourceType = filter.resourceType;
  if (filter.resourceId) query.resourceId = new Types.ObjectId(filter.resourceId);
  if (filter.actorId) query.actorId = new Types.ObjectId(filter.actorId);
  if (filter.communityId) query.communityId = new Types.ObjectId(filter.communityId);

  if (filter.from || filter.to) {
    query.createdAt = {
      ...(filter.from ? { $gte: filter.from } : {}),
      ...(filter.to ? { $lt: filter.to } : {}),
    };
  }

  return query;
}

export const auditRepository = {
  async insert(entry: RecordAuditInput & { requestId: string | null }): Promise<void> {
    await AuditLogModel.create({
      actorId: new Types.ObjectId(entry.actorId),
      actorRole: entry.actorRole,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: new Types.ObjectId(entry.resourceId),
      communityId: entry.communityId ? new Types.ObjectId(entry.communityId) : null,
      summary: entry.summary,
      metadata: entry.metadata ?? null,
      ip: entry.ip ?? null,
      requestId: entry.requestId,
    });
  },

  async list(filter: ListAuditFilter): Promise<{ items: AuditLogDocument[]; total: number }> {
    const query = buildQuery(filter);
    const skip = (filter.page - 1) * filter.pageSize;

    const [items, total] = await Promise.all([
      AuditLogModel.find(query)
        // `_id` breaks ties: two rows written in the same millisecond would
        // otherwise be free to swap places between pages and be shown twice.
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(filter.pageSize)
        .lean<AuditLogDocument[]>({ lean: true })
        .exec(),
      AuditLogModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  },
};
