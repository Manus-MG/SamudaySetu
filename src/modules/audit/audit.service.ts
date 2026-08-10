import { getContext } from '../../core/context/index.js';
import { logger } from '../../core/logger/index.js';
import { paginate, type Paginated } from '../../shared/types.js';
import { auditRepository } from './audit.repository.js';
import type { AuditLogDocument } from './auditLog.model.js';
import type { AuditLogDto, ListAuditFilter, RecordAuditInput } from './audit.types.js';

function toDto(doc: AuditLogDocument): AuditLogDto {
  return {
    id: doc._id.toString(),
    actorId: doc.actorId.toString(),
    actorRole: doc.actorRole,
    action: doc.action,
    resourceType: doc.resourceType,
    resourceId: doc.resourceId.toString(),
    communityId: doc.communityId?.toString() ?? null,
    summary: doc.summary,
    metadata: doc.metadata,
    ip: doc.ip,
    requestId: doc.requestId,
    createdAt: doc.createdAt.toISOString(),
  };
}

export const auditService = {
  /**
   * Writes one audit entry. **Never throws and never rejects.**
   *
   * The trade-off is explicit: a failed audit write must not roll back or fail the
   * business action the user already completed successfully. A dropped row is
   * logged at `error` so it is still visible to monitoring, which is the right
   * balance for an operational trail. If this ever becomes a *compliance* trail
   * where a missing row is worse than a failed request, invert this — write the
   * log inside the same transaction as the change and let a failure propagate.
   *
   * Callers should `void` this rather than await it; it is not on the hot path of
   * any response.
   */
  async record(entry: RecordAuditInput): Promise<void> {
    try {
      await auditRepository.insert({
        ...entry,
        requestId: getContext()?.requestId ?? null,
      });
    } catch (error) {
      logger.error(
        { err: error, action: entry.action, resourceId: entry.resourceId },
        'Failed to write audit log entry',
      );
    }
  },

  async list(filter: ListAuditFilter): Promise<Paginated<AuditLogDto>> {
    const { items, total } = await auditRepository.list(filter);
    return paginate(items.map(toDto), total, filter.page, filter.pageSize);
  },
};
