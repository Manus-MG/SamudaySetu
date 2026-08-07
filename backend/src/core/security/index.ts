export { assertNoAadhaar, findAadhaarField, isValidVerhoeff } from './aadhaarGuard.js';

// Side-effecting import: augments Express's `Request` with `auth`.
import './principal.js';
export type { Principal } from './principal.js';

export {
  ROLES,
  ROLE_RANK,
  STAFF_ROLES,
  PERMISSIONS,
  isStaffRole,
  hasPermission,
  permissionsFor,
  canAssignRole,
  outranks,
} from './roles.js';
export type { Role, Permission } from './roles.js';

export { hashPassword, verifyPassword } from './password.js';

export {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from './tokens.js';
export type { AccessTokenClaims, SignedAccessToken } from './tokens.js';
