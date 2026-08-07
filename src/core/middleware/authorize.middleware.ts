import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../errors/index.js';
import { hasPermission, type Permission, type Role } from '../security/index.js';

/**
 * Pure authorisation guards: they read the principal that `authenticate` already
 * resolved and never touch the database. Keeping them free of I/O is what lets
 * them live in `core` and be reused by every module.
 *
 * Always mount after `authenticate`.
 */
function requirePrincipal(req: Request): NonNullable<Request['auth']> {
  if (!req.auth) {
    // A guard reached without authentication is a wiring bug, not a client error.
    throw AppError.unauthenticated('Authentication is required for this route');
  }
  return req.auth;
}

/**
 * Prefer this over `requireRole`. Asking for a capability means changing who can
 * do what is a one-line edit to the permission matrix, not a route change.
 */
export function requirePermission(permission: Permission): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const { role } = requirePrincipal(req);
      if (!hasPermission(role, permission)) {
        throw AppError.forbidden('You do not have permission to perform this action', {
          messageHi: 'आपके पास यह कार्य करने की अनुमति नहीं है।',
          details: { requiredPermission: permission },
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Escape hatch for routes gated by identity rather than capability. */
export function requireRole(...allowed: readonly Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const { role } = requirePrincipal(req);
      if (!allowed.includes(role)) {
        throw AppError.forbidden('This action is restricted', {
          messageHi: 'यह कार्य प्रतिबंधित है।',
          details: { allowedRoles: allowed },
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
