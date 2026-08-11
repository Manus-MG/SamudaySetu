import { randomInt } from 'node:crypto';
import {
  env,
  JOIN_CODE_MAX_LENGTH,
  JOIN_CODE_MIN_LENGTH,
  JOIN_CODE_RESERVED,
} from '../../config/index.js';
import { textToQrDataUrl, textToQrPngDataUrl } from '../../core/qr/index.js';
import { JOIN_WORDS, toDevanagariCode } from './joinWords.js';

/**
 * Join codes, and the shapes a community shares them in.
 *
 * The design question this file answers is: *how does a 70-year-old receive a
 * code from their community leader?* Almost always over a phone call or a
 * forwarded WhatsApp message, and almost never by carefully copying characters.
 * Everything below follows from that.
 *
 * Two kinds of code, one storage format:
 *   - **Generated** — a pair of everyday Hindi words, `SURAJ-KAMAL`.
 *   - **Custom** — whatever the leader chose, usually their community's own name,
 *     `GUPTASAMAJ`.
 *
 * Both are stored twice: `joinCode` is the display form with its hyphens, and
 * `joinCodeNormalised` strips everything but letters and digits. Uniqueness and
 * lookup both use the normalised form, so `suraj kamal`, `SURAJ-KAMAL` and
 * `surajkamal` all resolve to the same community. Getting a hyphen wrong should
 * never be the reason someone cannot join.
 *
 * Pure apart from `generateJoinCode`, so it is testable and reusable by the
 * mobile API without a database.
 */

// ── Generation ───────────────────────────────────────────────────────────────

/**
 * A fresh two-word code.
 *
 * `crypto.randomInt` rather than `Math.random`: this code is the only thing
 * between the internet and a community's member list, so one issued code must
 * not narrow the guess for the next. `randomInt` also rejection-samples, so no
 * word is more likely than another — a modulo of a random byte would quietly
 * bias the list.
 */
export function generateJoinCode(): string {
  const first = randomInt(JOIN_WORDS.length);

  // Draw the second from the remaining words so a code is never `AAM-AAM`,
  // which reads as a mistake and halves the perceived space.
  let second = randomInt(JOIN_WORDS.length - 1);
  if (second >= first) second += 1;

  return `${JOIN_WORDS[first]?.latin ?? ''}-${JOIN_WORDS[second]?.latin ?? ''}`;
}

// ── Normalisation ────────────────────────────────────────────────────────────

/**
 * The canonical key a code is stored and looked up by: letters and digits only,
 * uppercase.
 *
 * Deliberately lossy. People send codes as `k7m2-qx9b`, `Suraj Kamal`, with a
 * trailing full stop, or pasted inside the whole URL. Every one of those should
 * find the community; formatting is not information.
 */
export function normaliseJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/**
 * The display form: uppercase, with `-` as the only separator.
 *
 * Preserves the leader's word boundaries rather than inventing them, because
 * `SURAJ-KAMAL` is two words a person can hold in their head and `SURAJKAMAL` is
 * a string they have to spell.
 */
export function toDisplayCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s._]+/g, '-')
    .replace(/[^0-9A-Z-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** `SURAJ-KAMAL` → `सूरज-कमल`, or `null` for a custom code. See `toDevanagariCode`. */
export const toHindiCode = toDevanagariCode;

/** The words of a code, for a UI that wants to show them one at a time. */
export const splitCodeWords = (code: string): string[] => code.split('-').filter(Boolean);

// ── Validation of custom codes ───────────────────────────────────────────────

export type CustomCodeProblem =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_CHARACTERS'
  | 'NEEDS_A_LETTER'
  | 'RESERVED';

export interface CustomCodeCheck {
  ok: boolean;
  problem?: CustomCodeProblem;
  /** Present when `ok`: the display form to store. */
  display?: string;
  /** Present when `ok`: the lookup key to store. */
  normalised?: string;
}

const RESERVED_SET: ReadonlySet<string> = new Set(JOIN_CODE_RESERVED);

/**
 * Validates a leader-chosen code and returns both storage forms.
 *
 * Returns a result rather than throwing so the same function can serve the
 * "is this available?" endpoint the admin UI calls on every keystroke, without
 * exceptions as control flow.
 *
 * Uniqueness is *not* checked here — that is the database's job, and checking it
 * in a pure function would be a lie about atomicity.
 */
export function checkCustomJoinCode(input: string): CustomCodeCheck {
  const display = toDisplayCode(input);
  const normalised = normaliseJoinCode(input);

  // Character validity is checked *before* length, and the order matters. A
  // leader who types their community's name in Devanagari has every character
  // stripped, and a length check running first would tell them the code is "too
  // short" — which is both false and unactionable. Say what is actually wrong.
  //
  // Anything not a letter, digit or separator was dropped by `toDisplayCode`.
  // Rejecting rather than accepting the remainder means nobody prints a poster
  // carrying a code the server quietly rewrote.
  if (!/^[0-9A-Z-]+$/.test(input.trim().toUpperCase().replace(/[\s._]+/g, '-'))) {
    return { ok: false, problem: 'INVALID_CHARACTERS' };
  }

  if (normalised.length < JOIN_CODE_MIN_LENGTH) return { ok: false, problem: 'TOO_SHORT' };
  if (normalised.length > JOIN_CODE_MAX_LENGTH) return { ok: false, problem: 'TOO_LONG' };

  // An all-digit code is indistinguishable from an OTP, an amount or a phone
  // number in a forwarded message.
  if (!/[A-Z]/.test(normalised)) return { ok: false, problem: 'NEEDS_A_LETTER' };

  if (RESERVED_SET.has(normalised)) return { ok: false, problem: 'RESERVED' };

  return { ok: true, display, normalised };
}

/** User-facing explanation for each rejection, in both languages. */
export const CUSTOM_CODE_MESSAGES: Readonly<
  Record<CustomCodeProblem, { en: string; hi: string }>
> = Object.freeze({
  TOO_SHORT: {
    en: `Use at least ${String(JOIN_CODE_MIN_LENGTH)} letters or numbers`,
    hi: `कम से कम ${String(JOIN_CODE_MIN_LENGTH)} अक्षर या अंक रखें`,
  },
  TOO_LONG: {
    en: `Use at most ${String(JOIN_CODE_MAX_LENGTH)} letters or numbers`,
    hi: `अधिकतम ${String(JOIN_CODE_MAX_LENGTH)} अक्षर या अंक रखें`,
  },
  INVALID_CHARACTERS: {
    en: 'Use only English letters, numbers and hyphens',
    hi: 'केवल अंग्रेज़ी अक्षर, अंक और हाइफ़न का उपयोग करें',
  },
  NEEDS_A_LETTER: {
    en: 'Include at least one letter, so the code is not mistaken for an OTP',
    hi: 'कम से कम एक अक्षर रखें, ताकि कोड ओटीपी जैसा न लगे',
  },
  RESERVED: {
    en: 'This word is reserved. Please choose another.',
    hi: 'यह शब्द सुरक्षित है। कृपया दूसरा चुनें।',
  },
});

// ── Sharing ──────────────────────────────────────────────────────────────────

/**
 * The link that goes on the poster and into WhatsApp.
 *
 * An https URL, not a custom scheme: a custom scheme shows a broken page to
 * anyone without the app, which during a community's first recruitment drive is
 * almost everyone. Configure the host as an Android App Link / iOS Universal Link
 * and users who do have the app land inside it instead.
 */
export function buildJoinUrl(code: string): string {
  return `${env.PUBLIC_APP_BASE_URL}/join/${encodeURIComponent(code)}`;
}

/**
 * The same QR as a PNG data URL, for the Flutter app.
 *
 * Flutter cannot draw an SVG without `flutter_svg`, and adding a rendering
 * library to a 40 MB APK budget in order to paint a grid of squares is a poor
 * trade. `Image.memory` reads this natively. The web console keeps the SVG,
 * which stays sharp when printed at poster size.
 */
export function buildJoinQrPngDataUrl(code: string): string {
  return textToQrPngDataUrl(buildJoinUrl(code), { ecc: 'M', scale: 8, margin: 4 });
}

/** Custom-scheme fallback, for in-app share sheets and QR readers that prefer it. */
export function buildDeepLink(code: string): string {
  return `${env.MOBILE_DEEP_LINK_SCHEME}://join?code=${encodeURIComponent(code)}`;
}

/** One-tap invite link, tied to a single phone number. See the invites module. */
export function buildInviteUrl(token: string): string {
  return `${env.PUBLIC_APP_BASE_URL}/invite/${token}`;
}

/**
 * QR of the join URL as an inline SVG data URL.
 *
 * Level `M` with a 4-module quiet zone: enough redundancy to survive a photocopy
 * and a crease, without inflating the symbol past what a cheap phone camera can
 * lock onto at arm's length.
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
 * The message that actually travels.
 *
 * Hindi first, and the code is written out *as well as* linked: forwarded
 * WhatsApp messages routinely lose their preview, links get truncated by feature
 * phones, and someone reading this aloud needs the words, not the URL.
 */
export function buildShareMessage(communityName: string, code: string): string {
  const hindiCode = toHindiCode(code);

  return [
    `🙏 ${communityName} में आपका स्वागत है।`,
    '',
    'जुड़ने के लिए नीचे दिए लिंक पर टैप करें:',
    buildJoinUrl(code),
    '',
    `या ऐप में यह कोड डालें — ${toDisplayCode(code)}${hindiCode ? ` (${hindiCode})` : ''}`,
  ].join('\n');
}

/** The same message, wrapped for `wa.me` so one tap opens WhatsApp composed. */
export function buildWhatsAppShareUrl(communityName: string, code: string): string {
  return `https://wa.me/?text=${encodeURIComponent(buildShareMessage(communityName, code))}`;
}

/** SMS body for a phone invite. Kept short — one segment, and read on a feature phone. */
export function buildInviteSms(communityName: string, inviteUrl: string): string {
  return `${communityName} me judne ke liye is link par tap karein: ${inviteUrl}`;
}
