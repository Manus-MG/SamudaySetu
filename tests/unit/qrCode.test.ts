import { describe, expect, it } from 'vitest';
import { encodeQr } from '../../src/core/qr/qrCode.js';
import { qrMatrixToSvg, textToQrDataUrl } from '../../src/core/qr/qrSvg.js';

/**
 * These tests verify the encoder structurally rather than by comparing against a
 * golden image: a QR code has eight valid maskings and any of them scans, so a
 * byte-for-byte fixture would lock in an implementation detail rather than
 * correctness.
 *
 * What is asserted instead are the properties a scanner actually depends on —
 * symbol geometry, the three finder patterns, the timing spine and the mandatory
 * dark module. A payload round-trip through a full decoder was used to validate
 * the Reed-Solomon and interleaving logic during development.
 */

/** The 7x7 finder pattern, as seen at each of the three corners. */
function hasFinderAt(
  modules: readonly (readonly boolean[])[],
  originX: number,
  originY: number,
): boolean {
  const expected = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];

  return expected.every((row, dy) =>
    row.every((cell, dx) => modules[originY + dy]?.[originX + dx] === (cell === 1)),
  );
}

describe('encodeQr', () => {
  it('picks the smallest version that fits and sizes the symbol accordingly', () => {
    const tiny = encodeQr('A');
    expect(tiny.version).toBe(1);
    expect(tiny.size).toBe(21);

    const url = encodeQr('https://app.samudaysetu.in/join/K7M2QX9B');
    expect(url.version).toBeGreaterThan(1);
    expect(url.size).toBe(url.version * 4 + 17);
  });

  it('draws all three finder patterns', () => {
    const { modules, size } = encodeQr('https://app.samudaysetu.in/join/K7M2QX9B');

    expect(hasFinderAt(modules, 0, 0)).toBe(true);
    expect(hasFinderAt(modules, size - 7, 0)).toBe(true);
    expect(hasFinderAt(modules, 0, size - 7)).toBe(true);
  });

  it('draws the timing patterns and the mandatory dark module', () => {
    const { modules, size } = encodeQr('samudaysetu://join?code=K7M2QX9B');

    for (let i = 8; i < size - 8; i++) {
      expect(modules[6]?.[i]).toBe(i % 2 === 0);
      expect(modules[i]?.[6]).toBe(i % 2 === 0);
    }

    expect(modules[size - 8]?.[8]).toBe(true);
  });

  it('grows the symbol as the error-correction level rises', () => {
    const payload = 'x'.repeat(200);
    const low = encodeQr(payload, { ecc: 'L' });
    const high = encodeQr(payload, { ecc: 'H' });

    expect(high.version).toBeGreaterThan(low.version);
  });

  it('encodes multi-byte UTF-8 without truncating', () => {
    // A Devanagari community name costs three bytes per character; the version
    // must be chosen from the byte length, never the string length.
    const hindi = 'गुप्ता समाज में शामिल हों';
    const short = 'x'.repeat(hindi.length);

    expect(encodeQr(hindi).version).toBeGreaterThan(encodeQr(short).version);
  });

  it('refuses a payload no symbol can hold', () => {
    expect(() => encodeQr('x'.repeat(5000))).toThrow(RangeError);
  });
});

describe('qr svg rendering', () => {
  it('applies the quiet zone to the viewBox', () => {
    const matrix = encodeQr('A');
    const svg = qrMatrixToSvg(matrix, { margin: 4 });

    expect(svg).toContain(`viewBox="0 0 ${String(matrix.size + 8)} ${String(matrix.size + 8)}"`);
  });

  it('escapes the accessible title rather than injecting it raw', () => {
    const svg = qrMatrixToSvg(encodeQr('A'), { title: 'Gupta <Samaj> & "Co"' });

    expect(svg).toContain('&lt;Samaj&gt;');
    expect(svg).toContain('&amp;');
    expect(svg).not.toContain('<Samaj>');
  });

  it('produces a base64 data URL that decodes back to the SVG', () => {
    const dataUrl = textToQrDataUrl('https://app.samudaysetu.in/join/K7M2QX9B');
    expect(dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);

    const decoded = Buffer.from(dataUrl.split(',')[1] ?? '', 'base64').toString('utf8');
    expect(decoded.startsWith('<svg')).toBe(true);
    expect(decoded.trimEnd().endsWith('</svg>')).toBe(true);
  });
});
