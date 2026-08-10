/**
 * A self-contained QR Code encoder (ISO/IEC 18004), byte mode only.
 *
 * Why vendored rather than a dependency: a join-code QR is printed on posters and
 * pasted into WhatsApp — it is core product surface, it must render identically
 * for years, and it must never be the reason a deploy fails on a package that
 * went unmaintained. The algorithm is frozen by an international standard, so
 * there is nothing here that will ever need upgrading.
 *
 * Scope is deliberately narrow:
 *   - Byte mode only. Join URLs are mixed-case ASCII; alphanumeric mode cannot
 *     encode them and numeric/kanji modes are irrelevant.
 *   - No structured append, no ECI. A join link fits in a single symbol.
 *
 * Everything below follows the standard's terminology: a *module* is one square,
 * a *codeword* is one byte, and *function patterns* are the finder/timing/
 * alignment squares that carry no data.
 */

export type EccLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrMatrix {
  readonly version: number;
  readonly ecc: EccLevel;
  /** Side length in modules; always `version * 4 + 17`. */
  readonly size: number;
  /** `modules[y][x]` — `true` is a dark module. */
  readonly modules: readonly (readonly boolean[])[];
}

export interface EncodeOptions {
  /**
   * Error-correction level. `M` (~15% recovery) is the right default for a
   * printed poster: `L` is too fragile once a page is creased or sun-bleached,
   * and `Q`/`H` inflate the symbol for no practical gain at these payload sizes.
   */
  ecc?: EccLevel;
  /** Smallest version to consider. Raising it produces a physically larger symbol. */
  minVersion?: number;
}

const MIN_VERSION = 1;
const MAX_VERSION = 40;

/** The five-bit format field's ECC half. Not the same order as `ECC_ROW`. */
const ECC_FORMAT_BITS: Readonly<Record<EccLevel, number>> = Object.freeze({
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
});

/** Row index into the capacity tables below. */
const ECC_ROW: Readonly<Record<EccLevel, number>> = Object.freeze({ L: 0, M: 1, Q: 2, H: 3 });

/**
 * ECC codewords per block, indexed `[eccRow][version]`. Index 0 of each row is a
 * placeholder so that `version` can be used directly as the index.
 */
const ECC_CODEWORDS_PER_BLOCK: readonly (readonly number[])[] = [
  // 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26  27  28  29  30  31  32  33  34  35  36  37  38  39  40
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // L
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28], // M
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // Q
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // H
];

/** Number of error-correction blocks, indexed `[eccRow][version]`. */
const NUM_ERROR_CORRECTION_BLOCKS: readonly (readonly number[])[] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25], // L
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49], // M
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68], // Q
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81], // H
];

// ── Small typed helpers ──────────────────────────────────────────────────────
//
// `noUncheckedIndexedAccess` is on, and the algorithms below index arrays inside
// tight loops whose bounds are guaranteed by construction. Rather than sprinkle
// non-null assertions through the hot paths, every read goes through one of these.

const at = (row: readonly number[], index: number): number => row[index] ?? 0;

const bitAt = (value: number, index: number): boolean => ((value >>> index) & 1) !== 0;

// ── Capacity arithmetic ──────────────────────────────────────────────────────

/**
 * Total modules available to data and ECC for a version, i.e. every module that is
 * not part of a function pattern or a format/version field.
 */
function getNumRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;

  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    // Alignment patterns cost 25 modules each, less the overlap with the timing
    // patterns that the two edge rows/columns share.
    result -= (25 * numAlign - 10) * numAlign - 55;
    // Versions 7+ carry two 18-module copies of the version field.
    if (version >= 7) result -= 36;
  }

  return result;
}

/** Codewords available to the payload once error correction is subtracted. */
function getNumDataCodewords(version: number, ecc: EccLevel): number {
  const row = ECC_ROW[ecc];
  const eccPerBlock = at(ECC_CODEWORDS_PER_BLOCK[row] ?? [], version);
  const numBlocks = at(NUM_ERROR_CORRECTION_BLOCKS[row] ?? [], version);
  return Math.floor(getNumRawDataModules(version) / 8) - eccPerBlock * numBlocks;
}

/** Centre coordinates of the alignment patterns, ascending. Empty for version 1. */
function getAlignmentPatternPositions(version: number): number[] {
  if (version === 1) return [];

  const numAlign = Math.floor(version / 7) + 2;
  // Version 32 is the one case the general formula gets wrong; the standard
  // special-cases it.
  const step =
    version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;

  const positions = [6];
  for (let pos = version * 4 + 10; positions.length < numAlign; pos -= step) {
    positions.splice(1, 0, pos);
  }
  return positions;
}

// ── Reed–Solomon over GF(2^8), primitive polynomial 0x11D ────────────────────

/** Carry-less multiply reduced modulo the field polynomial. Branch-free by design. */
function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/**
 * Coefficients of the generator polynomial of the given degree, highest power
 * omitted (it is always 1). Computed rather than tabulated — 40 versions × 4
 * levels of hard-coded tables is 40 chances to typo a byte.
 */
function computeRsDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;

  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j] ?? 0, root);
      if (j + 1 < degree) result[j] = (result[j] ?? 0) ^ (result[j + 1] ?? 0);
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

/** Polynomial remainder of `data` divided by `divisor` — the ECC codewords. */
function computeRsRemainder(data: readonly number[], divisor: Uint8Array): number[] {
  const result = new Uint8Array(divisor.length);

  for (const byte of data) {
    const factor = byte ^ (result[0] ?? 0);
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < divisor.length; i++) {
      result[i] = (result[i] ?? 0) ^ gfMultiply(divisor[i] ?? 0, factor);
    }
  }

  return Array.from(result);
}

// ── Bit assembly ─────────────────────────────────────────────────────────────

class BitBuffer {
  private readonly bits: boolean[] = [];

  get length(): number {
    return this.bits.length;
  }

  append(value: number, width: number): void {
    for (let i = width - 1; i >= 0; i--) this.bits.push(bitAt(value, i));
  }

  appendBytes(bytes: Uint8Array): void {
    for (const byte of bytes) this.append(byte, 8);
  }

  /** Pads to a byte boundary with zeros and returns the codewords. */
  toCodewords(): number[] {
    const codewords: number[] = new Array<number>(Math.ceil(this.bits.length / 8)).fill(0);
    this.bits.forEach((bit, index) => {
      if (bit) codewords[index >>> 3] = (codewords[index >>> 3] ?? 0) | (0x80 >>> (index & 7));
    });
    return codewords;
  }
}

/**
 * Splits the payload into blocks, appends ECC to each and interleaves them, which
 * is what makes a QR code survive a localised smudge: adjacent modules in the
 * symbol belong to different blocks, so damage is spread thinly across all of them
 * rather than destroying one block outright.
 */
function addEccAndInterleave(
  data: readonly number[],
  version: number,
  ecc: EccLevel,
): number[] {
  const row = ECC_ROW[ecc];
  const numBlocks = at(NUM_ERROR_CORRECTION_BLOCKS[row] ?? [], version);
  const blockEccLen = at(ECC_CODEWORDS_PER_BLOCK[row] ?? [], version);

  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const divisor = computeRsDivisor(blockEccLen);
  const blocks: number[][] = [];

  for (let i = 0, offset = 0; i < numBlocks; i++) {
    const dataLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const blockData = data.slice(offset, offset + dataLen);
    offset += dataLen;

    const blockEcc = computeRsRemainder(blockData, divisor);
    // Short blocks get a placeholder so every block has the same length while
    // interleaving; the placeholder is skipped on the way out.
    if (i < numShortBlocks) blockData.push(0);
    blocks.push(blockData.concat(blockEcc));
  }

  const result: number[] = [];
  const blockLen = blocks[0]?.length ?? 0;
  for (let i = 0; i < blockLen; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        result.push(blocks[j]?.[i] ?? 0);
      }
    }
  }
  return result;
}

// ── Symbol construction ──────────────────────────────────────────────────────

/** The eight mask patterns from the standard, in order. */
const MASK_FUNCTIONS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

/**
 * Builds the module grid. Kept as a class purely because the drawing steps share
 * a lot of mutable state (`modules`, `isFunction`) that would otherwise be
 * threaded through a dozen functions.
 */
class SymbolBuilder {
  readonly size: number;
  readonly modules: boolean[][];
  /** Parallel grid marking modules that must not be masked or overwritten. */
  private readonly isFunction: boolean[][];

  constructor(
    private readonly version: number,
    private readonly ecc: EccLevel,
  ) {
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
    this.isFunction = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
  }

  private get(x: number, y: number): boolean {
    return this.modules[y]?.[x] ?? false;
  }

  private set(x: number, y: number, dark: boolean): void {
    const row = this.modules[y];
    if (row) row[x] = dark;
  }

  private setFunction(x: number, y: number, dark: boolean): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return;
    this.set(x, y, dark);
    const row = this.isFunction[y];
    if (row) row[x] = true;
  }

  private reserved(x: number, y: number): boolean {
    return this.isFunction[y]?.[x] ?? false;
  }

  drawFunctionPatterns(): void {
    // Timing patterns: the alternating spine that tells a scanner the module pitch.
    for (let i = 0; i < this.size; i++) {
      this.setFunction(6, i, i % 2 === 0);
      this.setFunction(i, 6, i % 2 === 0);
    }

    this.drawFinder(3, 3);
    this.drawFinder(this.size - 4, 3);
    this.drawFinder(3, this.size - 4);

    const positions = getAlignmentPatternPositions(this.version);
    const last = positions.length - 1;
    for (let i = 0; i <= last; i++) {
      for (let j = 0; j <= last; j++) {
        // The three corners are already occupied by finder patterns.
        const isFinderCorner =
          (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);
        if (!isFinderCorner) {
          this.drawAlignment(positions[i] ?? 0, positions[j] ?? 0);
        }
      }
    }

    // Reserve the format area now with a throwaway value; the real bits depend on
    // the mask, which is not chosen until the data is placed.
    this.drawFormatBits(0);
    this.drawVersionBits();
  }

  private drawFinder(centerX: number, centerY: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        this.setFunction(centerX + dx, centerY + dy, distance !== 2 && distance !== 4);
      }
    }
  }

  private drawAlignment(centerX: number, centerY: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunction(centerX + dx, centerY + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  /** Writes both redundant copies of the 15-bit format field for a given mask. */
  drawFormatBits(mask: number): void {
    const data = (ECC_FORMAT_BITS[this.ecc] << 3) | mask;

    let remainder = data;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const bits = (((data << 10) | remainder) ^ 0x5412) & 0x7fff;

    // Copy 1 — around the top-left finder.
    for (let i = 0; i <= 5; i++) this.setFunction(8, i, bitAt(bits, i));
    this.setFunction(8, 7, bitAt(bits, 6));
    this.setFunction(8, 8, bitAt(bits, 7));
    this.setFunction(7, 8, bitAt(bits, 8));
    for (let i = 9; i < 15; i++) this.setFunction(14 - i, 8, bitAt(bits, i));

    // Copy 2 — split between the other two finders, so a torn corner is survivable.
    for (let i = 0; i < 8; i++) this.setFunction(this.size - 1 - i, 8, bitAt(bits, i));
    for (let i = 8; i < 15; i++) this.setFunction(8, this.size - 15 + i, bitAt(bits, i));

    // The "dark module" — mandated by the standard, always set.
    this.setFunction(8, this.size - 8, true);
  }

  private drawVersionBits(): void {
    if (this.version < 7) return;

    let remainder = this.version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const bits = (this.version << 12) | remainder;

    for (let i = 0; i < 18; i++) {
      const bit = bitAt(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunction(a, b, bit);
      this.setFunction(b, a, bit);
    }
  }

  /** Places codewords along the standard's two-column upward/downward zigzag. */
  drawCodewords(codewords: readonly number[]): void {
    let bitIndex = 0;
    const totalBits = codewords.length * 8;

    for (let right = this.size - 1; right >= 1; right -= 2) {
      // Column 6 is the vertical timing pattern; the pairing skips over it.
      if (right === 6) right = 5;

      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;

          if (!this.reserved(x, y) && bitIndex < totalBits) {
            const byte = codewords[bitIndex >>> 3] ?? 0;
            this.set(x, y, bitAt(byte, 7 - (bitIndex & 7)));
            bitIndex++;
          }
          // Remaining modules stay light: the standard's remainder bits are zero.
        }
      }
    }
  }

  private applyMask(mask: number): void {
    const maskFn = MASK_FUNCTIONS[mask];
    if (!maskFn) return;

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.reserved(x, y) && maskFn(x, y)) this.set(x, y, !this.get(x, y));
      }
    }
  }

  /**
   * Tries all eight masks and keeps the lowest-penalty one. This is not cosmetic:
   * an unlucky mask can produce large blank areas or finder-lookalike runs that
   * make the symbol slow or impossible to scan.
   */
  selectAndApplyBestMask(): number {
    let bestMask = 0;
    let bestPenalty = Number.MAX_SAFE_INTEGER;

    for (let mask = 0; mask < 8; mask++) {
      this.applyMask(mask);
      this.drawFormatBits(mask);
      const penalty = this.penaltyScore();
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestMask = mask;
      }
      // Masking is an XOR, so re-applying it restores the unmasked grid.
      this.applyMask(mask);
    }

    this.applyMask(bestMask);
    this.drawFormatBits(bestMask);
    return bestMask;
  }

  /** The four penalty rules from the standard, summed. */
  private penaltyScore(): number {
    let result = 0;
    const size = this.size;

    // Rules 1 and 3, scanned in both directions.
    for (let y = 0; y < size; y++) {
      result += this.lineScore((x) => this.get(x, y));
    }
    for (let x = 0; x < size; x++) {
      result += this.lineScore((y) => this.get(x, y));
    }

    // Rule 2: solid 2x2 blocks.
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const color = this.get(x, y);
        if (
          color === this.get(x + 1, y) &&
          color === this.get(x, y + 1) &&
          color === this.get(x + 1, y + 1)
        ) {
          result += PENALTY_N2;
        }
      }
    }

    // Rule 4: deviation of dark-module share from 50%.
    let dark = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) if (this.get(x, y)) dark++;
    }
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * PENALTY_N4;

    return result;
  }

  /**
   * Rule 1 (runs of five or more) and rule 3 (the 1:1:3:1:1 finder-lookalike
   * pattern) for a single row or column, using the sliding-history technique so
   * both are found in one pass.
   */
  private lineScore(read: (index: number) => boolean): number {
    const size = this.size;
    let score = 0;

    let runColor = false;
    let runLength = 0;
    const runHistory = new Array<number>(7).fill(0);

    const pushRun = (length: number): void => {
      runHistory.copyWithin(1, 0);
      runHistory[0] = length;
    };

    const finderPenalty = (): number => {
      const n = runHistory[1] ?? 0;
      const core =
        n > 0 &&
        runHistory[2] === n &&
        runHistory[3] === n * 3 &&
        runHistory[4] === n &&
        runHistory[5] === n;
      if (!core) return 0;

      // The pattern only counts when flanked by four light modules on one side.
      const leftClear = (runHistory[0] ?? 0) >= n * 4 && (runHistory[6] ?? 0) >= n;
      const rightClear = (runHistory[6] ?? 0) >= n * 4 && (runHistory[0] ?? 0) >= n;
      return (leftClear ? 1 : 0) + (rightClear ? 1 : 0);
    };

    for (let i = 0; i < size; i++) {
      const color = read(i);
      if (color === runColor) {
        runLength++;
        if (runLength === 5) score += PENALTY_N1;
        else if (runLength > 5) score += 1;
      } else {
        pushRun(runLength);
        if (!runColor) score += finderPenalty() * PENALTY_N3;
        runColor = color;
        runLength = 1;
      }
    }

    // Flush the trailing run, padding with a wide light margin so a pattern that
    // ends at the symbol edge is still evaluated.
    pushRun(runLength);
    if (runColor) pushRun(0);
    score += finderPenalty() * PENALTY_N3;

    return score;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Encodes `text` as the smallest QR symbol that fits at the requested ECC level.
 *
 * Throws only if the payload exceeds version 40 (roughly 2.3 KB at level M),
 * which no join URL can reach.
 */
export function encodeQr(text: string, options: EncodeOptions = {}): QrMatrix {
  const ecc = options.ecc ?? 'M';
  const minVersion = Math.min(Math.max(options.minVersion ?? MIN_VERSION, MIN_VERSION), MAX_VERSION);

  const payload = new TextEncoder().encode(text);

  let version = minVersion;
  let dataCapacityBits = 0;
  for (; version <= MAX_VERSION; version++) {
    dataCapacityBits = getNumDataCodewords(version, ecc) * 8;
    // Mode indicator (4) + character count (8 or 16) + payload.
    const requiredBits = 4 + (version < 10 ? 8 : 16) + payload.length * 8;
    if (requiredBits <= dataCapacityBits) break;
  }
  if (version > MAX_VERSION) {
    throw new RangeError(
      `Payload of ${String(payload.length)} bytes is too large for a QR code at level ${ecc}`,
    );
  }

  const buffer = new BitBuffer();
  buffer.append(0b0100, 4); // Byte mode.
  buffer.append(payload.length, version < 10 ? 8 : 16);
  buffer.appendBytes(payload);

  // Terminator, then pad to a byte boundary.
  buffer.append(0, Math.min(4, dataCapacityBits - buffer.length));
  buffer.append(0, (8 - (buffer.length % 8)) % 8);

  const codewords = buffer.toCodewords();
  // The two alternating pad bytes are prescribed by the standard.
  const PAD_BYTES = [0xec, 0x11] as const;
  for (let i = 0; codewords.length * 8 < dataCapacityBits; i++) {
    codewords.push(PAD_BYTES[i % 2] ?? 0xec);
  }

  const builder = new SymbolBuilder(version, ecc);
  builder.drawFunctionPatterns();
  builder.drawCodewords(addEccAndInterleave(codewords, version, ecc));
  builder.selectAndApplyBestMask();

  return {
    version,
    ecc,
    size: builder.size,
    modules: builder.modules.map((row) => [...row]),
  };
}
