import { randomInt } from 'node:crypto';
import {
  env,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_GROUP_SIZE,
  JOIN_CODE_LENGTH,
} from '../../config/index.js';
import { textToQrDataUrl } from '../../core/qr/index.js';

/**
 * Join codes, and the three shapes a community shares them in: the code itself,
 * a link, and a QR image.
 *
 * All of it is pure apart from `generateJoinCode`, so it can be unit-tested and
 * reused by the Flutter API without a database.
 */

/**
 * A fresh code.
 *
 * `crypto.randomInt` rather than `Math.random`: the code is the only thing
 * standing between the internet and a community's member list, so it must not be
 * predictable from a previously issued one. `randomInt` is also rejection-sampled
 * internally, so no character is more likely than another — a modulo of a random
 * byte would quietly bias the alphabet.
 */
export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET.charAt(randomInt(JOIN_CODE_ALPHABET.length));
  }
  return code;
}

/**
 * Canonicalises whatever the user typed or pasted.
 *
 * People send codes as `k7m2-qx9b`, `K7M2 QX9B`, or wrapped in the whole URL.
 * Anything that is not an alphabet character is dropped and the rest is
 * upper-cased; validation of the result is the schema's job, not this function's.
 */
export function normaliseJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/** `K7M2QX9B` → `K7M2-QX9B`. Display only; never store the grouped form. */
export function formatJoinCode(code: string): string {
  const groups = code.match(new RegExp(`.{1,${String(JOIN_CODE_GROUP_SIZE)}}`, 'g'));
  return groups ? groups.join('-') : code;
}

/** True when every character is in the alphabet and the length is exact. */
export function isWellFormedJoinCode(code: string): boolean {
  if (code.length !== JOIN_CODE_LENGTH) return false;
  for (const char of code) {
    if (!JOIN_CODE_ALPHABET.includes(char)) return false;
  }
  return true;
}

/**
 * The link that goes on the poster.
 *
 * An https URL rather than a custom scheme, because a custom scheme shows a
 * broken page to anyone without the app — which, for a community's first
 * recruitment drive, is most people. Configure this host as an Android App Link
 * / iOS Universal Link and installed users land in the app instead.
 */
export function buildJoinUrl(code: string): string {
  return `${env.PUBLIC_APP_BASE_URL}/join/${code}`;
}

/** Custom-scheme fallback, for in-app share sheets and QR readers that prefer it. */
export function buildDeepLink(code: string): string {
  return `${env.MOBILE_DEEP_LINK_SCHEME}://join?code=${code}`;
}

/**
 * QR of the join URL as an inline SVG data URL.
 *
 * Level `M` and a 4-module quiet zone: enough redundancy to survive a photocopy
 * and a crease, without inflating the symbol to the point where it stops scanning
 * from a phone held at arm's length.
 */
export function buildJoinQrDataUrl(code: string, communityName: string): string {
  return textToQrDataUrl(buildJoinUrl(code), {
    ecc: 'M',
    scale: 8,
    margin: 4,
    title: `Join ${communityName}`,
  });
}

/**
 * Share text in Hindi, the product's default locale, with the code spelled out as
 * well as linked — a forwarded message often loses its link preview, and the code
 * alone is enough to join by hand.
 */
export function buildShareMessage(communityName: string, code: string): string {
  return [
    `${communityName} से जुड़ें।`,
    `कोड: ${formatJoinCode(code)}`,
    buildJoinUrl(code),
  ].join('\n');
}
