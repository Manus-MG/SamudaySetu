import { describe, expect, it } from 'vitest';
import { findAadhaarField, isValidVerhoeff } from '../../src/core/security/aadhaarGuard.js';

describe('aadhaarGuard', () => {
  it('accepts a checksum-valid Aadhaar as valid Verhoeff', () => {
    expect(isValidVerhoeff('234567890124')).toBe(true);
  });

  it('rejects a checksum-invalid 12-digit number', () => {
    expect(isValidVerhoeff('234567890123')).toBe(false);
  });

  it('finds a nested Aadhaar-looking value in a payload', () => {
    const field = findAadhaarField({ profile: { addressLine: 'ID 2345 6789 0124, Kanpur' } });
    expect(field).toBe('profile.addressLine');
  });

  it('leaves ordinary payloads alone', () => {
    expect(findAadhaarField({ fullName: 'राम कुमार', pincode: '208001' })).toBeUndefined();
  });
});
