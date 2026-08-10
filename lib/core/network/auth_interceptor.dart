import 'dart:async';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../storage/secure_storage.dart';
import 'api_failure.dart';

/// Attaches the access token, and transparently refreshes a 15-minute one
/// exactly once per burst of 401s.
///
/// [QueuedInterceptor] rather than plain [Interceptor] is load-bearing: it
/// serialises `onError`, so a screen firing six parallel requests triggers one
/// refresh instead of six. That matters because the server rotates refresh
/// tokens and treats a second use of the same one as replay — six concurrent
/// refreshes would revoke the whole device family and sign the user out.
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

  /// Endpoints that must never trigger refresh-and-retry.
  static const List<String> _skipPaths = <String>[
    '/auth/refresh',
    '/auth/login',
    '/auth/logout',
    '/auth/otp/request',
    '/auth/otp/verify',
  ];

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.readAccessToken();
    if (token != null) {
      options.headers[AppConfig.authorizationHeader] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final request = err.requestOptions;

    if (err.response?.statusCode != 401 || _shouldSkip(request)) {
      return handler.next(_withFailure(err));
    }

    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken == null) {
      await _onSessionExpired();
      return handler.next(_withFailure(err));
    }

    try {
      final response = await _refreshClient.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: <String, String>{'refreshToken': refreshToken},
      );

      final data = response.data?['data'];
      final newAccess = data is Map ? data['accessToken'] as String? : null;
      final newRefresh = data is Map ? data['refreshToken'] as String? : null;

      if (newAccess == null || newRefresh == null) {
        await _onSessionExpired();
        return handler.next(_withFailure(err));
      }

      // Refresh tokens are single-use; the server rotates on every call.
      await _storage.writeTokens(accessToken: newAccess, refreshToken: newRefresh);

      request.headers[AppConfig.authorizationHeader] = 'Bearer $newAccess';
      final retried = await _refreshClient.fetch<dynamic>(request);
      return handler.resolve(retried);
    } on DioException {
      // The refresh itself failed: expired, revoked, or reuse detected. No
      // amount of retrying fixes any of those.
      await _onSessionExpired();
      return handler.next(_withFailure(err));
    }
  }

  bool _shouldSkip(RequestOptions options) =>
      _skipPaths.any((path) => options.path.contains(path));

  /// Parses the envelope once, here at the boundary, and rides along on the
  /// exception so no screen has to unpack `response.data` itself.
  DioException _withFailure(DioException err) => err.copyWith(
        error: ApiFailure.from(err),
      );
}
