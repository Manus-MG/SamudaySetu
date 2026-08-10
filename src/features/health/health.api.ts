import { api } from '../../api/client.ts';
import type { ReadinessReport, StatusReport } from '../../api/types.ts';

/** Query keys are centralised so an invalidation cannot miss a cache by typo. */
export const healthKeys = {
  readiness: ['health', 'readiness'] as const,
  status: ['health', 'status'] as const,
};

export const healthApi = {
  /** Cheap probe: driver connection state only, no round-trip to Mongo. */
  readiness: (): Promise<ReadinessReport> => api.get<ReadinessReport>('/health/ready'),

  /** Readiness plus service name, version, environment and uptime. */
  status: (): Promise<StatusReport> => api.get<StatusReport>('/status'),
};
