import { Router } from 'express';
import { authRoutes } from './auth/index.js';
import { healthRoutes, statusRoutes } from './health/index.js';
import { userRoutes } from './users/index.js';

/**
 * Root API router. Every module owns exactly one router and is mounted here;
 * nothing else in the codebase registers routes.
 */
export const apiRouter: Router = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/status', statusRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
