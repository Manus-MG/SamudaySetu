/// Values that must stay identical to the backend contract.
abstract final class AppConstants {
  /// Base URL is injected at build time so the same binary is not rebuilt per env:
  /// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1`
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api/v1',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 20);

  static const String tenantHeader = 'X-Tenant-Id';
  static const String requestIdHeader = 'X-Request-Id';
  static const String authorizationHeader = 'Authorization';

  /// Secure-storage keys. The refresh token never leaves this store.
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String activeTenantKey = 'active_tenant_id';

  static const int otpLength = 6;
  static const Duration otpResendCooldown = Duration(seconds: 30);
}
