import { describe, expect, it } from 'vitest';
import {
  ROLES,
  canAssignRole,
  hasPermission,
  isStaffRole,
  outranks,
  permissionsFor,
} from '../../src/core/security/roles.js';

describe('roles', () => {
  it('exposes exactly the four supported roles', () => {
    expect(ROLES).toEqual(['SUPER_ADMIN', 'ADMIN', 'LEADER', 'USER']);
  });

  it('gives SUPER_ADMIN every permission', () => {
    expect(permissionsFor('SUPER_ADMIN')).toContain('user:delete');
    expect(hasPermission('SUPER_ADMIN', 'user:delete')).toBe(true);
  });

  it('withholds deletion from ADMIN', () => {
    expect(hasPermission('ADMIN', 'user:read')).toBe(true);
    expect(hasPermission('ADMIN', 'user:delete')).toBe(false);
  });

  it('lets LEADER read but not write', () => {
    expect(hasPermission('LEADER', 'user:read')).toBe(true);
    expect(hasPermission('LEADER', 'user:update')).toBe(false);
    expect(hasPermission('LEADER', 'user:role:assign')).toBe(false);
  });

  it('grants USER no administrative permission at all', () => {
    expect(permissionsFor('USER')).toHaveLength(0);
  });

  describe('privilege escalation', () => {
    it('refuses to let a role grant its own level', () => {
      expect(canAssignRole('ADMIN', 'ADMIN')).toBe(false);
      expect(canAssignRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(false);
    });

    it('refuses to let a role grant a higher level', () => {
      expect(canAssignRole('ADMIN', 'SUPER_ADMIN')).toBe(false);
      expect(canAssignRole('LEADER', 'ADMIN')).toBe(false);
    });

    it('allows granting strictly lower levels', () => {
      expect(canAssignRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
      expect(canAssignRole('ADMIN', 'LEADER')).toBe(true);
      expect(canAssignRole('ADMIN', 'USER')).toBe(true);
    });

    it('stops a peer acting on a peer', () => {
      expect(outranks('ADMIN', 'ADMIN')).toBe(false);
      expect(outranks('ADMIN', 'LEADER')).toBe(true);
    });
  });

  it('treats only SUPER_ADMIN and ADMIN as password-login staff', () => {
    expect(isStaffRole('SUPER_ADMIN')).toBe(true);
    expect(isStaffRole('ADMIN')).toBe(true);
    expect(isStaffRole('LEADER')).toBe(false);
    expect(isStaffRole('USER')).toBe(false);
  });
});
