import { env } from '../../config/index.js';

/**
 * The web page a join or invite link lands on.
 *
 * Every join URL is an `https://` URL rather than a custom scheme, precisely so
 * that it means something to the majority of recipients who do not have the app
 * yet — during a community's first recruitment drive that is nearly everyone.
 * This module is what those people see.
 *
 * Three constraints shaped it:
 *
 *   - **No JavaScript.** An automatic `location = 'samudaysetu://…'` redirect is
 *     the usual trick, and it is worse than a button: it fires inside WhatsApp's
 *     in-app browser where custom schemes are blocked, leaves a dead tab behind
 *     on iOS, and gives the user nothing to retry when it fails. A button they
 *     press is slower by one tap and works everywhere.
 *   - **No database lookup.** Rendering the community's name here would need an
 *     unauthenticated endpoint that turns a guessed code into a real name, which
 *     is exactly the enumeration oracle the authenticated `/lookup/:code` route
 *     and its rate limiter exist to prevent. The code is enough; the app shows
 *     the name on the confirmation screen, behind auth, where it belongs.
 *   - **One self-contained response.** No external CSS, fonts or images. This is
 *     opened on a 2G connection by someone who has just tapped a WhatsApp link,
 *     and a second request is a second chance to show a blank screen.
 */

/**
 * Escapes text for interpolation into HTML.
 *
 * The code comes from a URL path segment, so it is attacker-controlled: without
 * this, `/join/<script>…` is stored-XSS-by-link on our own origin. Applied at
 * the point of interpolation rather than at the route, because that is the only
 * place it cannot be forgotten.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface LandingPageOptions {
  /** Devanagari headline, e.g. `समुदाय से जुड़ें`. */
  readonly heading: string;
  /** One sentence under the heading. */
  readonly subheading: string;
  /** The `samudaysetu://…` URL the primary button opens. */
  readonly deepLink: string;
  /** Shown in a monospace plate when the link carries a human-readable code. */
  readonly code?: string;
}

/** Store buttons, omitted entirely when the listing does not exist yet. */
function storeLinks(): string {
  const rows: string[] = [];

  if (env.ANDROID_STORE_URL) {
    rows.push(
      `<a class="secondary" href="${escapeHtml(env.ANDROID_STORE_URL)}">Play Store से ऐप पाएँ</a>`,
    );
  }
  if (env.IOS_STORE_URL) {
    rows.push(
      `<a class="secondary" href="${escapeHtml(env.IOS_STORE_URL)}">App Store से ऐप पाएँ</a>`,
    );
  }

  return rows.join('\n      ');
}

export function renderLandingPage(options: LandingPageOptions): string {
  const { heading, subheading, deepLink, code } = options;

  // `lang="hi"` is not decoration: it picks the Devanagari font stack on Android
  // and stops iOS rendering the text with Latin metrics that clip the matras.
  return `<!doctype html>
<html lang="hi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>Samuday Setu</title>
  <style>
    :root { --saffron: #E8730C; --ink: #16130F; --sand: #FBF7F1; --muted: #6B6257; }
    @media (prefers-color-scheme: dark) {
      :root { --ink: #FBF7F1; --sand: #16130F; --muted: #9C9287; }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center;
      padding: 24px; background: var(--sand); color: var(--ink);
      font-family: system-ui, -apple-system, "Noto Sans Devanagari", "Segoe UI", sans-serif;
      line-height: 1.45; -webkit-text-size-adjust: 100%;
    }
    main { width: 100%; max-width: 380px; text-align: center; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    p { color: var(--muted); margin: 0 0 24px; font-size: 16px; }
    .code {
      display: inline-block; margin: 0 0 24px; padding: 14px 22px; border-radius: 12px;
      background: color-mix(in srgb, var(--muted) 14%, transparent);
      font-size: 22px; font-weight: 600; letter-spacing: 2px; word-break: break-all;
    }
    a {
      display: block; padding: 17px 20px; border-radius: 12px; margin-bottom: 12px;
      font-size: 17px; font-weight: 600; text-decoration: none;
      background: var(--saffron); color: #fff;
    }
    a.secondary {
      background: transparent; color: var(--ink); font-weight: 500;
      border: 1px solid color-mix(in srgb, var(--muted) 40%, transparent);
    }
    small { display: block; margin-top: 20px; color: var(--muted); font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(heading)}</h1>
    <p>${escapeHtml(subheading)}</p>
    ${code ? `<div class="code">${escapeHtml(code)}</div>` : ''}
    <a href="${escapeHtml(deepLink)}">ऐप में खोलें</a>
    ${storeLinks()}
    <small>ऐप पहले से है? ऊपर वाला बटन दबाएँ।</small>
  </main>
</body>
</html>`;
}
