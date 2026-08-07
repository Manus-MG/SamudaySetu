import { Router } from 'express';
import { healthController } from './health.controller.js';

/** Mounted at `/api/v1/health`. */
export const healthRoutes: Router = Router();

healthRoutes.get('/', healthController.ready);
healthRoutes.get('/live', healthController.live);
healthRoutes.get('/ready', healthController.ready);

/** Mounted at `/api/v1/status`. */
export const statusRoutes: Router = Router();

statusRoutes.get('/', healthController.status);
