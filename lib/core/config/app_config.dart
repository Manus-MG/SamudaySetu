/// Values that must stay identical to the backend contract, plus the handful of
/// knobs that change per environment.
///
/// `String.fromEnvironment` is compile-time, so the same source builds a debug
/// APK pointed at an emulator host and a release APK pointed at production
/// without a code change:
///
/// ```
/// flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1
/// ```
abstract final class AppConfig {
  /// `10.0.2.2` is the Android emulator's alias for the host machine's
  /// `localhost`. On a physical device, pass your machine's LAN IP instead.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api/v1',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 20);

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
