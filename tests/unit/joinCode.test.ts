import { describe, expect, it } from 'vitest';
import { JOIN_CODE_MAX_LENGTH, JOIN_CODE_MIN_LENGTH } from '../../src/config/constants.js';
import {
  checkCustomJoinCode,
  generateJoinCode,
  normaliseJoinCode,
  splitCodeWords,
  toDisplayCode,
  toHindiCode,
} from '../../src/modules/communities/joinCode.js';
import {
  JOIN_WORDS,
  JOIN_WORD_PAIR_SPACE,
} from '../../src/modules/communities/joinWords.js';

/**
 * The wordlist's properties are load-bearing, not cosmetic: a prefix pair breaks
 * separator-insensitive lookup, and a lookalike pair breaks the only channel that
 * matters — one person reading a code to another over the phone. Asserting them
 * here means the list stays safe as it grows.
 */
describe('the join wordlist', () => {
  const latins = JOIN_WORDS.map((entry) => entry.latin);

  it('has no duplicates, in either script', () => {
    expect(new Set(latins).size).toBe(latins.length);

    const devanagari = JOIN_WORDS.map((entry) => entry.devanagari);
    expect(new Set(devanagari).size).toBe(devanagari.length);
  });

  it('contains only uppercase A–Z of a readable length', () => {
    for (const latin of latins) {
      expect(latin, `${latin} must be plain uppercase Latin`).toMatch(/^[A-Z]{3,10}$/);
    }
  });

  it('never lets one word be a prefix of another', () => {
    // `SUR` + `AJGAR` and `SURAJ` + `GAR` would normalise to the same string, so
    // one of the two communities could never be created. Forbidding prefixes
    // removes the whole class rather than handling it.
    const sorted = [...latins].sort();
    const offenders = sorted
      .slice(0, -1)
      .map((current, index) => [current, sorted[index + 1] ?? ''] as const)
      .filter(([current, next]) => next.startsWith(current));

    expect(offenders).toEqual([]);
  });

  it('never contains two words that differ only in their last sound', () => {
    const offenders: string[] = [];
    for (let i = 0; i < latins.length; i++) {
      for (let j = i + 1; j < latins.length; j++) {
        const a = latins[i] ?? '';
        const b = latins[j] ?? '';
        if (a.length === b.length && a.slice(0, -1) === b.slice(0, -1)) {
          offenders.push(`${a}/${b}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('is large enough that collisions stay rare', () => {
    expect(JOIN_WORD_PAIR_SPACE).toBeGreaterThan(20_000);
  });
});

describe('generateJoinCode', () => {
  it('produces two different words from the list', () => {
    const known = new Set(JOIN_WORDS.map((entry) => entry.latin));

    for (let i = 0; i < 500; i++) {
      const words = splitCodeWords(generateJoinCode());
      expect(words).toHaveLength(2);
      expect(words[0]).not.toBe(words[1]);
      for (const w of words) expect(known.has(w)).toBe(true);
    }
  });

  it('uses the whole list rather than favouring the front of it', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20_000; i++) {
      for (const w of splitCodeWords(generateJoinCode())) seen.add(w);
    }
    expect(seen.size).toBe(JOIN_WORDS.length);
  });
});

describe('normaliseJoinCode', () => {
  it.each([
    ['suraj-kamal', 'SURAJKAMAL'],
    ['SURAJ KAMAL', 'SURAJKAMAL'],
    ['  Suraj_Kamal.  ', 'SURAJKAMAL'],
    ['surajkamal', 'SURAJKAMAL'],
  ])('collapses %s to the same key', (input, expected) => {
    expect(normaliseJoinCode(input)).toBe(expected);
  });

  it('is what makes a missing hyphen harmless', () => {
    // The single most likely mistake when someone reads a code aloud.
    expect(normaliseJoinCode('SURAJKAMAL')).toBe(normaliseJoinCode('SURAJ-KAMAL'));
  });

  it('is idempotent', () => {
    const once = normaliseJoinCode('suraj-kamal');
    expect(normaliseJoinCode(once)).toBe(once);
  });
});

describe('toDisplayCode', () => {
  it.each([
    ['suraj kamal', 'SURAJ-KAMAL'],
    ['suraj--kamal', 'SURAJ-KAMAL'],
    ['-suraj-kamal-', 'SURAJ-KAMAL'],
    ['Gupta Samaj', 'GUPTA-SAMAJ'],
  ])('renders %s as %s', (input, expected) => {
    expect(toDisplayCode(input)).toBe(expected);
  });
});

describe('toHindiCode', () => {
  it('renders a generated code in Devanagari', () => {
    expect(toHindiCode('SURAJ-KAMAL')).toBe('सूरज-कमल');
  });

  it('returns null for a custom code rather than guessing a transliteration', () => {
    // A wrong transliteration printed on a poster is worse than none at all.
    expect(toHindiCode('GUPTASAMAJ')).toBeNull();
    expect(toHindiCode('SURAJ-NOTAWORD')).toBeNull();
  });
});

describe('checkCustomJoinCode', () => {
  it('accepts a community name and returns both storage forms', () => {
    const result = checkCustomJoinCode('Gupta Samaj');
    expect(result.ok).toBe(true);
    expect(result.display).toBe('GUPTA-SAMAJ');
    expect(result.normalised).toBe('GUPTASAMAJ');
  });

  it('rejects codes that are too short or too long', () => {
    expect(checkCustomJoinCode('AB').problem).toBe('TOO_SHORT');
    expect(checkCustomJoinCode('A'.repeat(JOIN_CODE_MAX_LENGTH + 1)).problem).toBe('TOO_LONG');
    expect(checkCustomJoinCode('A'.repeat(JOIN_CODE_MIN_LENGTH)).ok).toBe(true);
  });

  it('rejects an all-digit code, which reads as an OTP', () => {
    expect(checkCustomJoinCode('12345678').problem).toBe('NEEDS_A_LETTER');
  });

  it('rejects characters it would otherwise silently drop', () => {
    // Silently rewriting the input is how a leader ends up printing a poster
    // carrying a code the server never stored.
    expect(checkCustomJoinCode('गुप्ता').problem).toBe('INVALID_CHARACTERS');
    expect(checkCustomJoinCode('samaj@2026').problem).toBe('INVALID_CHARACTERS');
  });

  it('refuses reserved words that would impersonate the platform', () => {
    expect(checkCustomJoinCode('admin').problem).toBe('RESERVED');
    expect(checkCustomJoinCode('Support').problem).toBe('RESERVED');
    expect(checkCustomJoinCode('samudaysetu').problem).toBe('RESERVED');
  });
});
