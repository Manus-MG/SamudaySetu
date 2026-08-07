import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/core/security/password.js';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('a-sufficiently-long-password');
    await expect(verifyPassword('a-sufficiently-long-password', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('a-sufficiently-long-password');
    await expect(verifyPassword('a-sufficiently-long-passwerd', hash)).resolves.toBe(false);
  });

  it('salts, so the same password never produces the same hash', async () => {
    const [first, second] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);
    expect(first).not.toBe(second);
  });

  it('encodes algorithm and version so the format can be migrated', async () => {
    expect(await hashPassword('some-password')).toMatch(/^scrypt\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it('denies access on a malformed stored hash instead of throwing', async () => {
    for (const corrupt of ['', 'garbage', 'scrypt$1$notHex$alsoNotHex', 'bcrypt$1$aa$bb']) {
      await expect(verifyPassword('some-password', corrupt)).resolves.toBe(false);
    }
  });
});
