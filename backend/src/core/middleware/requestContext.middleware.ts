import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../../config/index.js';
import { runWithContext } from '../context/index.js';

/**
 * Must be the FIRST middleware. Everything downstream — including the Mongoose
 * tenant-scope plugin — reads from the store opened here.
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.header(REQUEST_ID_HEADER);
  const requestId = headerId && headerId.length <= 64 ? headerId : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  runWithContext({ requestId }, () => {
    next();
  });
}
