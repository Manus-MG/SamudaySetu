import type { NextFunction, Request, Response } from 'express';
import { assertNoAadhaar } from '../security/index.js';

/** Applied globally to every mutating request. See ARCHITECTURE.md §4. */
export function aadhaarGuard(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') return next();
  try {
    assertNoAadhaar(req.body);
    next();
  } catch (error) {
    next(error);
  }
}
