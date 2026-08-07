import type { MongoStatus } from '../../core/db/index.js';

export type DependencyState = 'up' | 'down';

export interface LivenessReport {
  status: 'alive';
  uptimeSeconds: number;
}

export interface ReadinessReport {
  /** `ok` only when every dependency required to serve traffic is up. */
  status: 'ok' | 'degraded';
  dependencies: {
    mongo: {
      state: DependencyState;
      detail: MongoStatus;
    };
  };
}

export interface StatusReport extends ReadinessReport {
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}
