import type { Server } from 'node:http';
import { createApp } from './app.js';
import { SHUTDOWN_TIMEOUT_MS, env } from './config/index.js';
import { connectMongo, disconnectMongo } from './core/db/index.js';
import { logger } from './core/logger/index.js';

/**
 * Process lifecycle owner: connect dependencies, listen, then tear everything
 * down cleanly. The app itself knows nothing about any of this.
 */
async function bootstrap(): Promise<void> {
  // Fail fast: a process that cannot reach its database must not accept traffic.
  await connectMongo();

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  registerShutdownHandlers(server);
}

function registerShutdownHandlers(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully`);

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(() => {
      void (async () => {
        try {
          await disconnectMongo();
          logger.info('Shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, 'Error during shutdown');
          process.exit(1);
        }
      })();
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection');
  });

  // An uncaught exception leaves the process in an undefined state; never continue.
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
  });
}

void bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
