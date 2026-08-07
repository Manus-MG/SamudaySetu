import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not forward rejected promises to the error middleware.
 * Every async route handler must be wrapped in this.
 */
export const asyncHandler =
  <T extends RequestHandler>(handler: T): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
