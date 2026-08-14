import '../../../core/config/app_brand.dart';
import '../../../core/network/api_client.dart';
import '../domain/app_user.dart';

/// Thin, typed wrappers over `/api/v1/auth` and the self-service user routes.
///
/// Every method either returns a parsed domain object or throws an
/// `ApiFailure`. No screen ever sees a `Map`.
class AuthApi {
  const AuthApi(this._client);

  final ApiClient _client;

  /// Sends a 6-digit code. The server enforces 3 per phone per hour on top of
  /// a per-IP limiter, so a `RATE_LIMITED` failure here is expected, not a bug.
  Future<OtpChallenge> requestOtp(String phone) async {
    final data = await _client.post('/auth/otp/request', body: <String, String>{
      'phone': phone,
    });
    return OtpChallenge.fromJson(data);
  }

  /// One entry point for login *and* signup: an unknown phone creates the
  /// account and returns `isNewUser: true`. A low-literacy user is never asked
  /// to choose between "Login" and "Sign up".
  Future<AuthResult> verifyOtp({
    required String phone,
    required String otp,
    required String deviceId,
  }) async {
    final data = await _client.post('/auth/otp/verify', body: <String, Object>{
      'phone': phone,
      'otp': otp,
      'device': <String, String>{
        'deviceId': deviceId,
        'deviceName': '${AppBrand.appTitle} (Android)',
        'platform': 'android',
      },
    });
    return AuthResult.fromJson(data);
  }

  /// Resolves the signed-in user from the access token. Used to restore a
  /// session on cold start, and to detect a role change or suspension.
  Future<AppUser> me() async {
    final data = await _client.get('/users/me');
    return AppUser.fromJson(data);
  }

  /// Updates the caller's own profile. Every field is optional; only what is
  /// passed is sent, so a screen that edits the name cannot blank the rest.
  Future<AppUser> updateProfile({String? fullName, String? preferredLanguage}) async {
    final data = await _client.patch('/users/me', body: <String, String>{
      if (fullName != null && fullName.trim().isNotEmpty) 'fullName': fullName.trim(),
      if (preferredLanguage != null) 'preferredLanguage': preferredLanguage,
    });
    return AppUser.fromJson(data);
  }

  Future<void> logout(String refreshToken) async {
    await _client.post('/auth/logout', body: <String, String>{
      'refreshToken': refreshToken,
    });
  }
}
