import express, { type Express, type Request } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { API_PREFIX, BODY_LIMIT, env, isProduction, REQUEST_ID_HEADER } from './config/index.js';
import { getContext } from './core/context/index.js';
import { logger } from './core/logger/index.js';
import {
  aadhaarGuard,
  errorHandler,
  globalRateLimiter,
  notFoundHandler,
  requestContextMiddleware,
} from './core/middleware/index.js';
import { linkRoutes } from './modules/links/index.js';
import { apiRouter } from './modules/index.js';

const HEALTH_PATH_PREFIX = `${API_PREFIX}/health`;

/**
 * Resolves a browser `Origin` against the `CORS_ORIGINS` allow-list.
 *
 * Requests without an `Origin` header — curl, the Flutter app, server-to-server —
 * are allowed through: CORS is a browser mechanism and blocking them here would
 * only break non-browser clients while stopping no attacker.
 *
 * Outside production an empty allow-list falls back to reflecting the origin, so
 * a fresh clone with no `.env` still works against `vite dev`. In production an
 * empty list denies every browser origin, which is the safe failure mode.
 */
function resolveCorsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  if (!origin) return callback(null, true);

  if (env.CORS_ORIGINS.length === 0) return callback(null, !isProduction);

  callback(null, env.CORS_ORIGINS.includes(origin));
}

/**
 * Builds the Express application. Kept free of any I/O so tests can mount the app
 * without a database, and so `server.ts` owns the entire process lifecycle.
 *
 * Middleware order is load-bearing — see the numbered comments.
 */
export function createApp(): Express {
  const app = express();

  // Behind a load balancer / nginx: required for correct client IPs in rate limiting.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // 1. Ambient request context must be established before anything else runs.
  app.use(requestContextMiddleware);

  app.use(
    pinoHttp({
      logger,
      genReqId: () => getContext()?.requestId ?? '',
      // Health probes fire every few seconds; logging them buries real traffic.
      autoLogging: {
        ignore: (req: Request) => req.url?.startsWith(HEALTH_PATH_PREFIX) ?? false,
      },
    }),
  );

  app.use(helmet());
  app.use(
    cors({
      // An allow-list, not `origin: true`. Reflecting any origin while
      // `credentials` is on lets any site on the internet make authenticated
      // requests on a signed-in user's behalf.
      origin: resolveCorsOrigin,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', REQUEST_ID_HEADER],
      exposedHeaders: [REQUEST_ID_HEADER],
    }),
  );
  app.use(compression());

  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

  // 2. Aadhaar can never enter the system — reject at the input layer, because a
  //    value that reached the database is also in the backups, logs and replicas.
  app.use(aadhaarGuard);

  // 3. Public web surface, at the host root rather than under the API prefix —
  //    the platforms fix `/.well-known/*`, and `/join/*` is already printed on
  //    posters, so neither can be namespaced.
  //
  //    Ahead of the rate limiter on purpose. These handlers do no I/O and touch
  //    no database, while the requests hitting them include Google's and Apple's
  //    App Link verification fetches, which arrive from shared crawler IPs. A
  //    429 there does not fail loudly — it silently leaves every install falling
  //    back to the browser, which is the exact bug this module exists to fix.
  app.use(linkRoutes);

  app.use(globalRateLimiter);

  app.use(API_PREFIX, apiRouter);

  // 4. Terminal handlers, in this order and always last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
