import 'package:dio/dio.dart';

import '../error/api_exception.dart';
import '../error/failure.dart';

/// Converts transport-level errors into domain [Failure]s at the boundary, so no
/// `DioException` ever leaks above the data layer.
class ErrorInterceptor extends Interceptor {
  const ErrorInterceptor();

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    handler.reject(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: _toFailure(err),
      ),
    );
  }

  Failure _toFailure(DioException err) {
    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const TimeoutFailure();
      case DioExceptionType.connectionError:
        return const NetworkFailure();
      case DioExceptionType.cancel:
      case DioExceptionType.badCertificate:
      case DioExceptionType.unknown:
        return const UnknownFailure();
      case DioExceptionType.badResponse:
        return _fromResponse(err.response);
    }
  }

  Failure _fromResponse(Response<dynamic>? response) {
    final status = response?.statusCode;
    if (status == 401) return const UnauthorizedFailure();

    final body = response?.data;
    if (body is Map<String, dynamic>) {
      final api = ApiException.fromJson(body, statusCode: status);
      return ServerFailure(
        api.message,
        messageHi: api.messageHi,
        code: api.code,
        statusCode: status,
      );
    }
    return ServerFailure('Request failed', statusCode: status);
  }
}
