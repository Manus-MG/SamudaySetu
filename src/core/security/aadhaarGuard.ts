import { AppError, ErrorCode } from '../errors/index.js';

/**
 * Aadhaar must never be stored — Aadhaar Act s.38 (3 years imprisonment + Rs 10L).
 * Reject at the input layer: a value that touched the DB is in the backups, the
 * logs and the replica set. See ARCHITECTURE.md §4.
 */
const AADHAAR_PATTERN = /\b\d{4}\s?-?\d{4}\s?-?\d{4}\b/g;

// Verhoeff dihedral group tables — Aadhaar's checksum algorithm.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
] as const;

const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
] as const;

export function isValidVerhoeff(digits: string): boolean {
  if (!/^\d{12}$/.test(digits)) return false;
  let checksum = 0;
  const reversed = digits.split('').reverse();
  for (let i = 0; i < reversed.length; i += 1) {
    const digit = Number(reversed[i]);
    checksum = D[checksum]![P[i % 8]![digit]!]!;
  }
  return checksum === 0;
}

/** Returns the first field path that contains a checksum-valid Aadhaar number. */
export function findAadhaarField(payload: unknown, path = ''): string | undefined {
  if (typeof payload === 'string') {
    const matches = payload.match(AADHAAR_PATTERN);
    if (matches?.some((m) => isValidVerhoeff(m.replace(/[\s-]/g, '')))) return path || 'body';
    return undefined;
  }
  if (Array.isArray(payload)) {
    for (let i = 0; i < payload.length; i += 1) {
      const found = findAadhaarField(payload[i], `${path}[${i}]`);
      if (found) return found;
    }
    return undefined;
  }
  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload)) {
      const found = findAadhaarField(value, path ? `${path}.${key}` : key);
      if (found) return found;
    }
  }
  return undefined;
}

export function assertNoAadhaar(payload: unknown): void {
  const field = findAadhaarField(payload);
  if (!field) return;
  throw new AppError(
    400,
    ErrorCode.AADHAAR_NOT_ALLOWED,
    'Aadhaar numbers cannot be submitted or stored. Please remove it and try again.',
    {
      messageHi: 'आधार नंबर यहाँ दर्ज नहीं किया जा सकता। कृपया इसे हटाकर पुनः प्रयास करें।',
      // The offending value is deliberately NOT included — logging it would store it.
      details: { field },
    },
  );
}
