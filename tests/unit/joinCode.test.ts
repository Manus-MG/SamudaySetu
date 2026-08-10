import { describe, expect, it } from 'vitest';
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '../../src/config/constants.js';
import {
  formatJoinCode,
  generateJoinCode,
  isWellFormedJoinCode,
  normaliseJoinCode,
} from '../../src/modules/communities/joinCode.js';

describe('generateJoinCode', () => {
  it('produces codes of the configured length using only the safe alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
      expect(isWellFormedJoinCode(code)).toBe(true);
    }
  });

  it('never contains both halves of a lookalike pair', () => {
    // The rule is not "ban these characters" but "never let two characters that
    // are misread for each other coexist" — `5` is perfectly safe once `S` is
    // gone. This is what makes a code readable off a photographed poster.
    const lookalikes = [
      ['0', 'O', 'Q'],
      ['1', 'I', 'L'],
      ['2', 'Z'],
      ['5', 'S'],
      ['6', 'G'],
      ['7', 'T'],
      ['8', 'B'],
      ['U', 'V'],
    ];

    for (const group of lookalikes) {
      const present = group.filter((char) => JOIN_CODE_ALPHABET.includes(char));
      expect(present.length, `ambiguous pair in alphabet: ${present.join('/')}`).toBeLessThan(2);
    }
  });

  it('excludes vowels, so no code can spell a word', () => {
    for (const vowel of ['A', 'E', 'I', 'O', 'U']) {
      expect(JOIN_CODE_ALPHABET).not.toContain(vowel);
    }
  });

  it('does not repeat itself over a large sample', () => {
    const codes = new Set(Array.from({ length: 2000 }, generateJoinCode));
    expect(codes.size).toBe(2000);
  });
});

describe('normaliseJoinCode', () => {
  it.each([
    ['k7m2qx9b', 'K7M2QX9B'],
    ['K7M2-QX9B', 'K7M2QX9B'],
    ['  k7m2 qx9b  ', 'K7M2QX9B'],
    ['K7M2_QX9B!', 'K7M2QX9B'],
    ['https://app.samudaysetu.in/join/K7M2QX9B', 'HTTPSAPPSAMUDAYSETUINJOINK7M2QX9B'],
  ])('normalises %s', (input, expected) => {
    expect(normaliseJoinCode(input)).toBe(expected);
  });

  it('is idempotent', () => {
    const once = normaliseJoinCode('k7m2-qx9b');
    expect(normaliseJoinCode(once)).toBe(once);
  });
});

describe('formatJoinCode', () => {
  it('groups for display without changing the stored value', () => {
    expect(formatJoinCode('K7M2QX9B')).toBe('K7M2-QX9B');
    expect(normaliseJoinCode(formatJoinCode('K7M2QX9B'))).toBe('K7M2QX9B');
  });
});

describe('isWellFormedJoinCode', () => {
  it('rejects wrong lengths and out-of-alphabet characters', () => {
    expect(isWellFormedJoinCode('K7M2QX9')).toBe(false);
    expect(isWellFormedJoinCode('K7M2QX9BB')).toBe(false);
    // `O` and `0` are deliberately absent from the alphabet.
    expect(isWellFormedJoinCode('K7M2QX9O')).toBe(false);
    expect(isWellFormedJoinCode('k7m2qx9b')).toBe(false);
    expect(isWellFormedJoinCode('K7M2QX9B')).toBe(true);
  });
});
