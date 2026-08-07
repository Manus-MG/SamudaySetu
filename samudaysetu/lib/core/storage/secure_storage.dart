import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/app_constants.dart';

/// Tokens live in the platform keystore/keychain — never in SharedPreferences.
class SecureStorage {
  const SecureStorage(this._storage);

  final FlutterSecureStorage _storage;

  static const FlutterSecureStorage defaultStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  Future<String?> readAccessToken() => _storage.read(key: AppConstants.accessTokenKey);

  Future<String?> readRefreshToken() => _storage.read(key: AppConstants.refreshTokenKey);

  Future<void> writeTokens({required String accessToken, required String refreshToken}) async {
    await Future.wait(<Future<void>>[
      _storage.write(key: AppConstants.accessTokenKey, value: accessToken),
      _storage.write(key: AppConstants.refreshTokenKey, value: refreshToken),
    ]);
  }

  Future<void> writeAccessToken(String accessToken) =>
      _storage.write(key: AppConstants.accessTokenKey, value: accessToken);

  Future<String?> readActiveTenantId() => _storage.read(key: AppConstants.activeTenantKey);

  Future<void> writeActiveTenantId(String tenantId) =>
      _storage.write(key: AppConstants.activeTenantKey, value: tenantId);

  /// Called on logout and on refresh-token reuse detection.
  Future<void> clear() => _storage.deleteAll();
}
