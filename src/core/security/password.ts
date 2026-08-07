import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

/**
 * scrypt from Node's own crypto module. Deliberately not argon2/bcrypt: both are
 * native addons that break `npm ci` on a mismatched platform, and scrypt is a
 * memory-hard KDF that is more than adequate here. Staff passwords are the only
 * passwords in the system — ordinary members authenticate by OTP and never have one.
 */
const ALGORITHM = 'scrypt';
const VERSION = '1';
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Encoded as `scrypt$1$<saltHex>$<hashHex>` so the format can be migrated later. */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(plaintext, salt, KEY_LENGTH);
  return [ALGORITHM, VERSION, salt.toString('hex'), derived.toString('hex')].join('$');
}

/**
 * Constant-time comparison. A malformed stored value returns `false` rather than
 * throwing, so a corrupt row denies access instead of 500-ing the login route.
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  const [algorithm, version, saltHex, expectedHex] = stored.split('$');

  if (algorithm !== ALGORITHM || version !== VERSION || !saltHex || !expectedHex) return false;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(expectedHex)) return false;

  const expected = Buffer.from(expectedHex, 'hex');
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await scrypt(plaintext, Buffer.from(saltHex, 'hex'), KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}
