import { encodeQr, type EccLevel, type QrMatrix } from './qrCode.js';

export interface SvgOptions {
  /** Pixels per module in the `width`/`height` attributes. The path itself is scalable. */
  scale?: number;
  /**
   * Light border in modules. The standard requires 4; anything less and scanners
   * on cluttered backgrounds start failing.
   */
  margin?: number;
  /** CSS colour for dark modules. */
  dark?: string;
  /** CSS colour for the background, or `'none'` for transparent. */
  light?: string;
  /** Accessible label. Rendered as `<title>` and referenced by `aria-labelledby`. */
  title?: string;
}

const DEFAULT_SCALE = 8;
const DEFAULT_MARGIN = 4;
const DEFAULT_DARK = '#000000';
const DEFAULT_LIGHT = '#ffffff';

/** Minimal XML text escaping for the `<title>` element. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Emits the dark modules as a single `<path>` of horizontal runs rather than one
 * `<rect>` per module. A version-5 symbol has ~1,200 dark modules; as rects that
 * is a ~60 KB document, as merged runs it is a few kilobytes — which matters
 * because this string is inlined into a data URL and sent to a phone.
 */
function buildPath(matrix: QrMatrix, margin: number): string {
  const segments: string[] = [];

  for (let y = 0; y < matrix.size; y++) {
    const row = matrix.modules[y];
    if (!row) continue;

    let runStart = -1;
    for (let x = 0; x <= matrix.size; x++) {
      const isDark = x < matrix.size && (row[x] ?? false);

      if (isDark && runStart < 0) {
        runStart = x;
      } else if (!isDark && runStart >= 0) {
        segments.push(`M${String(runStart + margin)} ${String(y + margin)}h${String(x - runStart)}v1h-${String(x - runStart)}z`);
        runStart = -1;
      }
    }
  }

  return segments.join('');
}

/** Renders a pre-computed matrix as a standalone SVG document. */
export function qrMatrixToSvg(matrix: QrMatrix, options: SvgOptions = {}): string {
  const scale = options.scale ?? DEFAULT_SCALE;
  const margin = options.margin ?? DEFAULT_MARGIN;
  const dark = options.dark ?? DEFAULT_DARK;
  const light = options.light ?? DEFAULT_LIGHT;

  const dimension = matrix.size + margin * 2;
  const pixels = dimension * scale;

  const titleMarkup = options.title
    ? `<title id="qr-title">${escapeXml(options.title)}</title>`
    : '';
  const labelledBy = options.title
    ? ' role="img" aria-labelledby="qr-title"'
    : ' role="img" aria-label="QR code"';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(pixels)}" height="${String(pixels)}" viewBox="0 0 ${String(dimension)} ${String(dimension)}" shape-rendering="crispEdges"${labelledBy}>`,
    titleMarkup,
    light === 'none'
      ? ''
      : `<rect width="${String(dimension)}" height="${String(dimension)}" fill="${light}"/>`,
    `<path fill="${dark}" d="${buildPath(matrix, margin)}"/>`,
    '</svg>',
  ].join('');
}

/** Convenience: encode and render in one call. */
export function textToQrSvg(
  text: string,
  options: SvgOptions & { ecc?: EccLevel } = {},
): string {
  return qrMatrixToSvg(encodeQr(text, { ...(options.ecc ? { ecc: options.ecc } : {}) }), options);
}

/**
 * Base64 data URL, safe to drop straight into an `<img src>`.
 *
 * Base64 rather than percent-encoded UTF-8: the payload contains `#` and `"`,
 * and every browser and email client handles the base64 form identically.
 */
export function textToQrDataUrl(
  text: string,
  options: SvgOptions & { ecc?: EccLevel } = {},
): string {
  const svg = textToQrSvg(text, options);
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}
