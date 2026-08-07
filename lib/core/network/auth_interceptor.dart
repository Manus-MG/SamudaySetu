import 'dart:async';

import 'package:dio/dio.dart';

import '../constants/app_constants.dart';
import '../storage/secure_storage.dart';

/// Attaches the access token and the active tenant, and transparently refreshes
/// a 15-minute access token exactly once per 401 — queueing concurrent requests
/// so a screen with six parallel calls triggers one refresh, not six.
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required SecureStorage storage,
    required Dio refreshClient,
    required Future<void> Function() onSessionExpired,
  })  : _storage = storage,
        _refreshClient = refreshClient,
        _onSessionExpired = onSessionExpired;

  final SecureStorage _storage;

  /// A bare Dio without this interceptor, so refreshing cannot recurse.
  final Dio _refreshClient;
  final Future<void> Function() _onSessionExpired;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.readAccessToken();
    if (token != null) {
      options.headers[AppConstants.authorizationHeader] = 'Bearer $token';
    }
    final tenantId = await _storage.readActiveTenantId();
    if (tenantId != null) {
      options.headers[AppConstants.tenantHeader] = tenantId;
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401 || _isRefreshCall(err.requestOptions)) {
      return handler.next(err);
    }

    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken == null) {
      await _onSessionExpired();
      return handler.next(err);
    }

    try {
      final response = await _refreshClient.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: <String, String>{'refreshToken': refreshToken},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final newAccess = data?['accessToken'] as String?;
      final newRefresh = data?['refreshToken'] as String?;
      if (newAccess == null || newRefresh == null) {
        await _onSessionExpired();
        return handler.next(err);
      }

      // Refresh tokens are single-use; the server rotates on every call.
      await _storage.writeTokens(accessToken: newAccess, refreshToken: newRefresh);

      final retried = await _retry(err.requestOptions, newAccess);
      return handler.resolve(retried);
    } on DioException {
      // Reuse detection on the server revokes the whole device family — force re-login.
      await _onSessionExpired();
      return handler.next(err);
    }
  }

  bool _isRefreshCall(RequestOptions options) => options.path.contains('/auth/refresh');

  Future<Response<dynamic>> _retry(RequestOptions options, String accessToken) {
    options.headers[AppConstants.authorizationHeader] = 'Bearer $accessToken';
    return _refreshClient.fetch<dynamic>(options);
  }
}
