import express, { type Express, type Request } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { API_PREFIX, BODY_LIMIT, REQUEST_ID_HEADER, env } from './config/index.js';
import { getContext } from './core/context/index.js';
import { logger } from './core/logger/index.js';
import {
  aadhaarGuard,
  errorHandler,
  globalRateLimiter,
  notFoundHandler,
  requestContextMiddleware,
} from './core/middleware/index.js';
import { apiRouter } from './modules/index.js';

const HEALTH_PATH_PREFIX = `${API_PREFIX}/health`;

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
      origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', REQUEST_ID_HEADER],
      exposedHeaders: [REQUEST_ID_HEADER],
    }),
  );
  app.use(compression());

  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

  // 2. Aadhaar can never enter the system — reject at the input layer, because a
  //    value that reached the database is also in the backups, logs and replicas.
  app.use(aadhaarGuard);

  app.use(globalRateLimiter);

  app.use(API_PREFIX, apiRouter);

  // 3. Terminal handlers, in this order and always last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
