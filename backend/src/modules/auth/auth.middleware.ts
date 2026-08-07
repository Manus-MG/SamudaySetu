import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { patchContext } from '../../core/context/index.js';
import { AppError, ErrorCode } from '../../core/errors/index.js';
import { verifyAccessToken } from '../../core/security/index.js';
import { usersService } from '../users/users.service.js';
import { ACTIVE_USER_STATUSES } from '../users/users.types.js';

const BEARER_PREFIX = 'Bearer ';

function extractBearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header?.startsWith(BEARER_PREFIX)) return null;
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies the access token and resolves the actor from the database on every
 * request.
 *
 * The database read is deliberate. Roles are not carried in the JWT, so suspending
 * a user or demoting a leader takes effect on their very next request rather than
 * whenever their 15-minute token happens to expire. That is worth one indexed
 * lookup by primary key.
 */
export const authenticate: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  void (async () => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        throw AppError.unauthenticated('Sign in to continue', {
          messageHi: 'जारी रखने के लिए लॉगिन करें।',
        });
      }

      const claims = verifyAccessToken(token);
      const user = await usersService.findById(claims.sub);

      if (!user) throw AppError.unauthenticated('Account no longer exists');

      if (user.status === 'SUSPENDED') {
        throw new AppError(403, ErrorCode.ACCOUNT_SUSPENDED, 'This account has been suspended', {
          messageHi: 'यह खाता निलंबित कर दिया गया है।',
        });
      }
      if (!ACTIVE_USER_STATUSES.includes(user.status)) {
        throw AppError.unauthenticated('This account is no longer active');
      }

      req.auth = { userId: claims.sub, role: user.role, deviceId: claims.did };
      patchContext({ userId: claims.sub, deviceId: claims.did });

      next();
    } catch (error) {
      next(error);
    }
  })();
};

/** Fail-closed accessor for handlers that run behind `authenticate`. */
export function requireAuth(req: Request): NonNullable<Request['auth']> {
  if (!req.auth) throw AppError.unauthenticated();
  return req.auth;
}
