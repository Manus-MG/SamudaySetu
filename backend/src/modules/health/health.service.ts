import { env } from '../../config/index.js';
import { getMongoStatus, isMongoHealthy } from '../../core/db/index.js';
import type { LivenessReport, ReadinessReport, StatusReport } from './health.types.js';

const SERVICE_NAME = 'samudaysetu-api';
const VERSION = process.env['npm_package_version'] ?? '0.1.0';

function liveness(): LivenessReport {
  return { status: 'alive', uptimeSeconds: Math.floor(process.uptime()) };
}

/**
 * Synchronous by design. Health probes are polled every few seconds by the
 * orchestrator, so they must never issue a network round-trip of their own — they
 * read the driver's already-maintained connection state instead.
 */
function readiness(): ReadinessReport {
  const mongoUp = isMongoHealthy();
  return {
    status: mongoUp ? 'ok' : 'degraded',
    dependencies: {
      mongo: { state: mongoUp ? 'up' : 'down', detail: getMongoStatus() },
    },
  };
}

function status(): StatusReport {
  return {
    ...readiness(),
    service: SERVICE_NAME,
    version: VERSION,
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

export const healthService = { liveness, readiness, status };
