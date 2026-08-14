import { Router, type Request, type Response } from 'express';
import helmet from 'helmet';
import { env } from '../../config/index.js';
import { renderLandingPage } from './links.page.js';

/**
 * Public, unauthenticated routes that live at the *root* of
 * `PUBLIC_APP_BASE_URL`, not under `/api/v1`.
 *
 * Two jobs, both of which only work from the root:
 *
 *   1. **App-link association files.** Android and iOS fetch these from fixed,
 *      non-negotiable paths under `/.well-known/`. They are what turn
 *      `https://<host>/join/SURAJ-KAMAL` from "opens a browser" into "opens the
 *      app on the join screen".
 *   2. **Web fallback pages.** For everyone whose device did not verify — no app
 *      installed, a desktop browser, WhatsApp's in-app webview — the same URL
 *      still has to render something useful rather than a JSON 404.
 *
 * Mounted before the API router in `app.ts`. The paths (`/join/:code`,
 * `/invite/:token`) mirror the Flutter route table in
 * `samudaysetu/lib/core/router/routes.dart` on purpose: one URL is valid both as
 * an in-app location and as a web address, so a link forwarded between the two
 * never has to be rewritten.
 */
export const linkRoutes: Router = Router();

/**
 * The global `helmet()` sets `style-src 'self'`, which blocks the inline
 * `<style>` block the landing page depends on. Relaxing it for these two pages
 * only — rather than app-wide — keeps the API's own headers strict.
 *
 * Everything else stays locked down, `script-src` most of all: this page has no
 * JavaScript and nothing should be able to add any.
 */
linkRoutes.use(
  helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
  }),
);

/**
 * Android App Links verification.
 *
 * Served as a computed object rather than a static file so the package name and
 * fingerprints come from the same env the rest of the process validated at boot —
 * a checked-in JSON would drift silently the first time the signing key changes.
 *
 * `Content-Type` must be exactly `application/json`; Android's verifier rejects
 * anything else, including `application/json; charset=utf-8` on some versions.
 * Hence `res.type` + `res.send` rather than `res.json`.
 */
linkRoutes.get('/.well-known/assetlinks.json', (_req: Request, res: Response) => {
  // No fingerprints yet means no release build to verify against. An empty array
  // would be a *valid* file asserting that no certificate is trusted, which is
  // worse than absent: Android caches the verification failure. A 404 leaves the
  // door open for the next install to verify cleanly.
  if (env.ANDROID_CERT_FINGERPRINTS.length === 0) {
    res.status(404).type('application/json').send('{}');
    return;
  }

  const statements = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: env.ANDROID_PACKAGE_NAME,
        sha256_cert_fingerprints: env.ANDROID_CERT_FINGERPRINTS,
      },
    },
  ];

  res
    .status(200)
    .type('application/json')
    .set('Cache-Control', 'public, max-age=3600')
    .send(JSON.stringify(statements));
});

/**
 * iOS Universal Links association.
 *
 * Note the path has no extension and the body must still be served as JSON.
 * `appIDs` (plural, iOS 13+) rather than the legacy `apps`/`details.appID`.
 */
linkRoutes.get('/.well-known/apple-app-site-association', (_req: Request, res: Response) => {
  if (!env.IOS_APP_ID) {
    res.status(404).type('application/json').send('{}');
    return;
  }

  const association = {
    applinks: {
      details: [
        {
          appIDs: [env.IOS_APP_ID],
          // Paths, not `components`, would work too; `components` is the modern
          // form and expresses the two prefixes without a wildcard that would
          // hand the app every URL on the host — including the API.
          components: [{ '/': '/join/*' }, { '/': '/invite/*' }],
        },
      ],
    },
  };

  res
    .status(200)
    .type('application/json')
    .set('Cache-Control', 'public, max-age=3600')
    .send(JSON.stringify(association));
});

/** `/join/<code>` — the link printed on posters and forwarded on WhatsApp. */
linkRoutes.get('/join/:code', (req: Request, res: Response) => {
  const code = String(req.params['code'] ?? '');

  res
    .status(200)
    .type('html')
    // The page is a pure function of the code, but a shared cache holding it
    // buys nothing and a stale copy after a rotation is actively misleading.
    .set('Cache-Control', 'no-store')
    .send(
      renderLandingPage({
        heading: 'समुदाय से जुड़ें',
        subheading: 'नीचे दिया बटन दबाएँ — ऐप खुलते ही आप जुड़ जाएँगे।',
        code: code.toUpperCase(),
        deepLink: `${env.MOBILE_DEEP_LINK_SCHEME}://join?code=${encodeURIComponent(code)}`,
      }),
    );
});

/** `/invite/<token>` — a one-tap invite tied to a single phone number. */
linkRoutes.get('/invite/:token', (req: Request, res: Response) => {
  const token = String(req.params['token'] ?? '');

  res
    .status(200)
    .type('html')
    .set('Cache-Control', 'no-store')
    .send(
      renderLandingPage({
        heading: 'आपको आमंत्रित किया गया है',
        subheading: 'नीचे दिया बटन दबाएँ — ऐप खुलते ही आप जुड़ जाएँगे।',
        // Deliberately not shown on screen. A 32-character token is unreadable,
        // unrepeatable over the phone, and displaying it invites someone to try
        // to type it. The button carries it.
        deepLink: `${env.MOBILE_DEEP_LINK_SCHEME}://invite?token=${encodeURIComponent(token)}`,
      }),
    );
});
