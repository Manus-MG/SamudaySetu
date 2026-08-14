/// Values that must stay identical to the backend contract, plus the handful of
/// knobs that change per environment.
///
/// `String.fromEnvironment` is compile-time, so the same source builds a release
/// APK pointed at production and a debug APK pointed at a local server without a
/// code change. Production is the *default* so a plain `flutter build` can never
/// ship an APK that quietly talks to a machine that is not on the user's network:
///
/// ```
/// # Production (default) — no flag needed.
/// flutter run
///
/// # Local backend from an Android emulator. `10.0.2.2` is the emulator's alias
/// # for the host machine's `localhost`; on a physical device pass the LAN IP.
/// flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1
/// ```
abstract final class AppConfig {
  /// Deployed backend. Ends at the version prefix — every path passed to
  /// [ApiClient] is relative to it (`/health/live`, `/auth/otp`, …), so this
  /// value must never carry a trailing slash: Dio would collapse the join and
  /// produce `//health/live`.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://samudaysetu.onrender.com/api/v1',
  );

  /// Host that owns the `https://…/join/<code>` and `/invite/<token>` links.
  ///
  /// Derived from [apiBaseUrl] rather than declared separately, because the
  /// backend serves the landing pages and the App Link association files from
  /// its own origin — two constants would be two things to keep in step, and the
  /// symptom of them drifting is that every deep link silently opens a browser.
  ///
  /// Compared against the incoming link's host in `DeepLinkService`, so that a
  /// look-alike URL from another origin cannot drive navigation in this app.
  static String get linkHost => Uri.parse(apiBaseUrl).host;

  /// Custom scheme registered with both platforms. Must match
  /// `MOBILE_DEEP_LINK_SCHEME` in the backend's environment, which composes the
  /// `samudaysetu://join?code=…` URL the web landing page's button opens.
  static const String deepLinkScheme = String.fromEnvironment(
    'DEEP_LINK_SCHEME',
    defaultValue: 'samudaysetu',
  );

  static const Duration connectTimeout = Duration(seconds: 15);

  /// Generous on purpose. The backend runs on a host that suspends idle
  /// instances, so the first request after a quiet period pays a cold start of
  /// up to ~50s. A tighter budget would surface that as a timeout error on the
  /// very first screen the user sees.
  static const Duration receiveTimeout = Duration(seconds: 60);

  static const String authorizationHeader = 'Authorization';

  // ── Secure-storage keys ────────────────────────────────────────────────────
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String deviceIdKey = 'device_id';

  // ── Preference keys (non-secret) ───────────────────────────────────────────
  static const String onboardingSeenKey = 'onboarding_seen';

  // ── OTP, mirrored from backend/src/config/constants.ts ─────────────────────
  static const int otpLength = 6;
  static const Duration otpResendCooldown = Duration(seconds: 30);

  /// Indian mobile numbers are 10 digits and start 6–9. The server normalises to
  /// E.164; validating here only saves the user a pointless round-trip.
  static const int phoneDigits = 10;
  static final RegExp phonePattern = RegExp(r'^[6-9]\d{9}$');

  static bool isValidPhone(String digits) => phonePattern.hasMatch(digits);
}
