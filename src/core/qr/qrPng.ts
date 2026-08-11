import { deflateSync } from 'node:zlib';
import { encodeQr, type EccLevel, type QrMatrix } from './qrCode.js';

/**
 * Renders a QR matrix as a PNG, using only `node:zlib`.
 *
 * Why PNG at all, when `qrSvg` already exists: Flutter cannot display an SVG
 * without `flutter_svg`, and adding a rendering library to a ~40 MB APK budget to
 * draw a grid of black squares is a poor trade. `Image.memory` handles PNG
 * natively. The web console keeps using the SVG, which stays crisp at poster size.
 *
 * The encoder is deliberately minimal: greyscale, 1 bit per pixel, one IDAT. A QR
 * code is two colours, so anything richer is wasted bytes on a 2G connection.
 */

export interface PngOptions {
  /** Pixels per module. 8 gives a ~300px symbol for a typical join URL. */
  scale?: number;
  /** Quiet zone in modules. The standard requires 4; below that, scanners fail. */
  margin?: number;
}

const DEFAULT_SCALE = 8;
const DEFAULT_MARGIN = 4;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * CRC-32, table-driven. Built once at module load — the per-chunk cost of
 * rebuilding it would dwarf the checksum itself.
 */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** `length | type | data | crc(type + data)` — the PNG chunk framing. */
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * Packs the matrix into 1-bit greyscale scanlines.
 *
 * In colour type 0 at bit depth 1, `0` is black and `1` is white — so a *dark*
 * QR module is a zero bit. Each row starts with a filter byte; filter 0 (None)
 * is used because the image is already near-optimal for deflate and per-row
 * filtering would only add work.
 */
function buildRawScanlines(matrix: QrMatrix, scale: number, margin: number): Buffer {
  const dimension = matrix.size + margin * 2;
  const pixelWidth = dimension * scale;
  const bytesPerRow = Math.ceil(pixelWidth / 8);

  const raw = Buffer.alloc((bytesPerRow + 1) * pixelWidth);

  for (let y = 0; y < pixelWidth; y++) {
    const rowStart = y * (bytesPerRow + 1);
    raw[rowStart] = 0; // filter: None

    // Default every pixel to white, then clear the bits that are dark.
    raw.fill(0xff, rowStart + 1, rowStart + 1 + bytesPerRow);

    const moduleY = Math.floor(y / scale) - margin;
    if (moduleY < 0 || moduleY >= matrix.size) continue;

    const row = matrix.modules[moduleY];
    if (!row) continue;

    for (let x = 0; x < pixelWidth; x++) {
      const moduleX = Math.floor(x / scale) - margin;
      if (moduleX < 0 || moduleX >= matrix.size) continue;
      if (!(row[moduleX] ?? false)) continue;

      const byteIndex = rowStart + 1 + (x >>> 3);
      raw[byteIndex] = (raw[byteIndex] ?? 0xff) & ~(0x80 >>> (x & 7));
    }
  }

  return raw;
}

/** Renders a pre-computed matrix as a PNG buffer. */
export function qrMatrixToPng(matrix: QrMatrix, options: PngOptions = {}): Buffer {
  const scale = Math.max(1, Math.floor(options.scale ?? DEFAULT_SCALE));
  const margin = Math.max(0, Math.floor(options.margin ?? DEFAULT_MARGIN));

  const pixelWidth = (matrix.size + margin * 2) * scale;

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(pixelWidth, 0);
  ihdr.writeUInt32BE(pixelWidth, 4);
  ihdr[8] = 1; // bit depth
  ihdr[9] = 0; // colour type: greyscale
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter method: adaptive
  ihdr[12] = 0; // interlace: none

  const raw = buildRawScanlines(matrix, scale, margin);
  // Level 9: the image is tiny and generated once per request, so spending a
  // millisecond to save bytes on a 2G connection is the right trade.
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Convenience: encode and render in one call. */
export function textToQrPng(
  text: string,
  options: PngOptions & { ecc?: EccLevel } = {},
): Buffer {
  return qrMatrixToPng(encodeQr(text, options.ecc ? { ecc: options.ecc } : {}), options);
}

/** Base64 data URL, ready for `Image.memory` in Flutter or `<img src>` on the web. */
export function textToQrPngDataUrl(
  text: string,
  options: PngOptions & { ecc?: EccLevel } = {},
): string {
  return `data:image/png;base64,${textToQrPng(text, options).toString('base64')}`;
}
