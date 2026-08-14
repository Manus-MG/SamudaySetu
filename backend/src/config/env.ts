import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for runtime configuration.
 * Parsed once at boot — the process must refuse to start on invalid config
 * rather than fail unpredictably at request time.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  /** Comma-separated allow-list of browser origins. Empty = no browser origin allowed. */
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().min(1).default('samudaysetu'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(60),

  /**
   * Origin the join link points at. It ends up printed on posters and forwarded
   * on WhatsApp, so it must be the public-facing host, not the API host.
   */
  PUBLIC_APP_BASE_URL: z
    .string()
    .url('PUBLIC_APP_BASE_URL must be an absolute URL')
    .default('http://localhost:5173')
    .transform((v) => v.replace(/\/+$/, '')),

  /** Custom scheme for the Flutter app's deep link, without `://`. */
  MOBILE_DEEP_LINK_SCHEME: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]*$/, 'Scheme must be lowercase and URL-safe')
    .default('samudaysetu'),

  /**
   * Android application id, used by `/.well-known/assetlinks.json`.
   *
   * Must match `applicationId` in `samudaysetu/android/app/build.gradle` exactly.
   * A mismatch does not error anywhere — Android simply declines to verify the
   * App Link and every join URL keeps opening in the browser.
   */
  ANDROID_PACKAGE_NAME: z.string().min(1).default('com.headway.samudaysetu.samudaysetu'),

  /**
   * SHA-256 fingerprints of the signing certificates, comma-separated, uppercase
   * hex with colons.
   *
   * Plural because a build signed by Play App Signing has two: the upload key you
   * hold and the app-signing key Google holds. Listing only one means links
   * verify on your test device and fail for every user who installed from Play.
   * Get them from Play Console → Setup → App integrity, or:
   *   keytool -list -v -keystore <keystore> -alias <alias>
   *
   * Empty until a release build exists. Verification then fails closed — links
   * open the web landing page, which is a correct experience, not a broken one.
   */
  ANDROID_CERT_FINGERPRINTS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),

  /**
   * iOS app id for `apple-app-site-association`: `<TeamID>.<BundleID>`, e.g.
   * `A1B2C3D4E5.com.headway.samudaysetu`. Empty until the app is provisioned.
   */
  IOS_APP_ID: z.string().default(''),

  /** Store listings, linked from the web landing page for users without the app. */
  ANDROID_STORE_URL: z.string().default(''),
  IOS_STORE_URL: z.string().default(''),

  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_PER_PHONE_PER_HOUR: z.coerce.number().int().positive().default(3),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
