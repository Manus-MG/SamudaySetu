import 'package:dio/dio.dart';

import '../constants/app_constants.dart';
import '../storage/secure_storage.dart';
import 'auth_interceptor.dart';
import 'error_interceptor.dart';

/// Builds the single Dio instance used by every remote data source.
abstract final class DioClient {
  static Dio create({
    required SecureStorage storage,
    required Future<void> Function() onSessionExpired,
  }) {
    final options = BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: AppConstants.connectTimeout,
      receiveTimeout: AppConstants.receiveTimeout,
      contentType: Headers.jsonContentType,
      responseType: ResponseType.json,
      // The envelope carries the error; let interceptors classify non-2xx bodies.
      validateStatus: (status) => status != null && status < 500,
    );

    final refreshClient = Dio(options);
    final dio = Dio(options)
      ..interceptors.addAll(<Interceptor>[
        AuthInterceptor(
          storage: storage,
          refreshClient: refreshClient,
          onSessionExpired: onSessionExpired,
        ),
        const ErrorInterceptor(),
      ]);

    return dio;
  }
}
