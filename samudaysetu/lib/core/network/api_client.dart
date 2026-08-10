import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../storage/secure_storage.dart';
import 'api_failure.dart';
import 'auth_interceptor.dart';

/// Builds the single Dio instance every data source shares, and unwraps the
/// `{ success, data }` envelope so callers deal in domain maps, not transport.
class ApiClient {
  ApiClient._(this._dio);

  factory ApiClient.create({
    required SecureStorage storage,
    required Future<void> Function() onSessionExpired,
  }) {
    final options = BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: AppConfig.connectTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      contentType: Headers.jsonContentType,
      responseType: ResponseType.json,
      // Only 2xx counts as success. Widening this to `< 500` would mean a 401
      // arrives as a *successful* response, `onError` never fires, and the
      // refresh interceptor below silently never runs.
      validateStatus: (status) => status != null && status >= 200 && status < 300,
    );

    final refreshClient = Dio(options);
    final dio = Dio(options)
      ..interceptors.add(
        AuthInterceptor(
          storage: storage,
          refreshClient: refreshClient,
          onSessionExpired: onSessionExpired,
        ),
      );

    return ApiClient._(dio);
  }

  final Dio _dio;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) =>
      _send(() => _dio.get<Map<String, dynamic>>(path, queryParameters: query));

  Future<Map<String, dynamic>> post(String path, {Object? body}) =>
      _send(() => _dio.post<Map<String, dynamic>>(path, data: body));

  Future<Map<String, dynamic>> patch(String path, {Object? body}) =>
      _send(() => _dio.patch<Map<String, dynamic>>(path, data: body));

  Future<Map<String, dynamic>> delete(String path) =>
      _send(() => _dio.delete<Map<String, dynamic>>(path));

  /// Runs the request, converts any transport error into [ApiFailure], and
  /// returns the `data` object from the envelope.
  ///
  /// Every endpoint in this API returns an object under `data`, so a non-object
  /// payload means the client and server have drifted — better to fail loudly
  /// here than to hand a screen a null it will dereference three frames later.
  Future<Map<String, dynamic>> _send(
    Future<Response<Map<String, dynamic>>> Function() request,
  ) async {
    try {
      final response = await request();
      final data = response.data?['data'];

      if (data is Map<String, dynamic>) return data;

      throw ApiFailure(
        code: ApiErrorCode.internal,
        message: 'Unexpected response shape from the server',
        messageHi: 'सर्वर से अप्रत्याशित उत्तर मिला',
        statusCode: response.statusCode,
      );
    } on DioException catch (error) {
      throw ApiFailure.from(error);
    }
  }
}
