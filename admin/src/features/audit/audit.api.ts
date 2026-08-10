import { api } from '../../api/client.ts';
import type { AuditLogDto, ListAuditParams, Paginated } from '../../api/types.ts';

export const auditKeys = {
  all: ['audit'] as const,
  list: (params: ListAuditParams) => ['audit', 'list', params] as const,
};

export const auditApi = {
  list: (params: ListAuditParams): Promise<Paginated<AuditLogDto>> =>
    api.get<Paginated<AuditLogDto>>('/audit', { ...params }),
};
