/**
 * Four roles, ordered by authority. Everything downstream — route guards, role
 * assignment, escalation checks — derives from this file and nothing else.
 *
 * Keep the set small. Titles like "Zila Adhyaksh" or "Booth Pramukh" are
 * *designations*, a separate tenant-configurable concept; they must never become
 * roles, or the permission model stops being auditable.
 */
export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'LEADER', 'USER'] as const;

export type Role = (typeof ROLES)[number];

/** Lower number = more authority. Used for the privilege-escalation guard. */
export const ROLE_RANK: Readonly<Record<Role, number>> = Object.freeze({
  SUPER_ADMIN: 0,
  ADMIN: 1,
  LEADER: 2,
  USER: 3,
});

/** Roles that sign in with email + password on the web dashboard. */
export const STAFF_ROLES: readonly Role[] = Object.freeze(['SUPER_ADMIN', 'ADMIN']);

export const isStaffRole = (role: Role): boolean => STAFF_ROLES.includes(role);

/**
 * Permissions are verbs, not role names. Route guards ask for a permission so that
 * changing who can do what is a change to this matrix, never a change to a route.
 */
export const PERMISSIONS = [
  'user:read',
  'user:update',
  'user:delete',
  'user:create',
  'user:role:assign',
  'user:status:manage',
  'session:revoke',

  // Communities. `community:moderate` is the approve/reject/suspend verb and is
  // deliberately separate from `community:update`: a leader edits their own
  // community's details but must never be able to approve it.
  'community:create',
  'community:read',
  'community:update',
  'community:delete',
  'community:moderate',
  'community:leader:assign',
  'community:code:manage',

  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS: readonly Permission[] = PERMISSIONS;

/**
 * `USER` intentionally holds no permissions: acting on yourself goes through the
 * `/users/me` routes, and joining a community goes through `/communities/join`,
 * both of which are authorised by identity rather than by permission.
 *
 * Holding a permission is necessary but not sufficient. A `LEADER` has
 * `community:update`, but the service layer additionally scopes every community
 * write to the one community they lead — see `assertMayManage` in
 * `communities.service.ts`. Permissions answer "may this role ever do this?";
 * scoping answers "to this specific row?".
 */
const PERMISSION_MATRIX: Readonly<Record<Role, readonly Permission[]>> = Object.freeze({
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: Object.freeze([
    'user:read',
    'user:update',
    'user:create',
    'user:role:assign',
    'user:status:manage',
    'session:revoke',
    'community:create',
    'community:read',
    'community:update',
    'community:moderate',
    'community:leader:assign',
    'community:code:manage',
    'audit:read',
  ] as const),
  // A leader may propose exactly one community and run it once approved. They
  // cannot approve it, cannot assign its leader, and cannot delete it.
  LEADER: Object.freeze([
    'user:read',
    'community:create',
    'community:read',
    'community:update',
    'community:code:manage',
  ] as const),
  USER: Object.freeze([] as const),
});

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role].includes(permission);
}

export function permissionsFor(role: Role): readonly Permission[] {
  return PERMISSION_MATRIX[role];
}

/**
 * Privilege-escalation guard: an actor may only grant roles strictly below their
 * own. Without this, any ADMIN can make themselves SUPER_ADMIN in one request.
 */
export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[actorRole] < ROLE_RANK[targetRole];
}

/**
 * Whether `actorRole` may act on a user holding `targetRole`. Peers cannot modify
 * each other — one ADMIN must not be able to suspend another ADMIN.
 */
export function outranks(actorRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[actorRole] < ROLE_RANK[targetRole];
}
