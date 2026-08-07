import type { Role } from './roles.js';

/**
 * The authenticated actor for the current request, resolved fresh from the database
 * by the `authenticate` middleware. Kept in `core` (rather than in the auth module)
 * so that guards and repositories can depend on the shape without depending on a
 * feature module.
 */
export interface Principal {
  userId: string;
  role: Role;
  /** Session/device id the access token was issued for. */
  deviceId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Present only after `authenticate` has run. */
      auth?: Principal;
    }
  }
}
