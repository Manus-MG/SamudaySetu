import '../entities/auth_session.dart';

abstract interface class AuthRepository {
  /// Sends an OTP. Throws a `Failure` when rate limited (3 per phone per hour).
  Future<void> requestOtp({required String phone});

  Future<AuthSession> verifyOtp({required String phone, required String otp});

  Future<void> signOut();

  /// Restores a session from secure storage on cold start.
  Future<AuthSession?> restoreSession();
}
