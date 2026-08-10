import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/app_config.dart';

/// Tokens live in the Android keystore / iOS keychain — never in
/// `SharedPreferences`, which is a world-readable XML file on a rooted device.
///
/// Every read and write of a credential goes through this one class, so the
/// storage mechanism is a single-file change if it ever needs to be.
class SecureStorage {
  const SecureStorage(this._storage);

  final FlutterSecureStorage _storage;

  static const FlutterSecureStorage defaultStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  Future<String?> readAccessToken() => _storage.read(key: AppConfig.accessTokenKey);

  Future<String?> readRefreshToken() => _storage.read(key: AppConfig.refreshTokenKey);

  Future<void> writeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait(<Future<void>>[
      _storage.write(key: AppConfig.accessTokenKey, value: accessToken),
      _storage.write(key: AppConfig.refreshTokenKey, value: refreshToken),
    ]);
  }

  /// A stable per-install identifier, sent at login so the user can tell one
  /// session from another on the devices screen.
  ///
  /// Cosmetic only, and generated on the client — it is never used for an
  /// authorisation decision, which is what makes that safe.
  Future<String> readOrCreateDeviceId() async {
    final existing = await _storage.read(key: AppConfig.deviceIdKey);
    if (existing != null && existing.length >= 8) return existing;

    final generated = _randomId();
    await _storage.write(key: AppConfig.deviceIdKey, value: generated);
    return generated;
  }

  /// Clears credentials on sign-out and on refresh-token reuse detection.
  ///
  /// The device id deliberately survives: it identifies the handset, not the
  /// session, and regenerating it would fill the user's device list with
  /// duplicates of the same phone.
  Future<void> clearSession() async {
    await Future.wait(<Future<void>>[
      _storage.delete(key: AppConfig.accessTokenKey),
      _storage.delete(key: AppConfig.refreshTokenKey),
    ]);
  }

  static String _randomId() {
    final random = Random.secure();
    return List<String>.generate(
      16,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
  }
}
