/// The error half of the backend response envelope:
/// `{ success: false, error: { code, message, messageHi } }`
class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.messageHi,
    this.statusCode,
    this.details,
  });

  factory ApiException.fromJson(Map<String, dynamic> json, {int? statusCode}) {
    final error = json['error'];
    if (error is! Map<String, dynamic>) {
      return ApiException(
        code: 'INTERNAL',
        message: 'Unexpected error response',
        statusCode: statusCode,
      );
    }
    return ApiException(
      code: error['code'] as String? ?? 'INTERNAL',
      message: error['message'] as String? ?? 'Something went wrong',
      messageHi: error['messageHi'] as String?,
      statusCode: statusCode,
      details: error['details'],
    );
  }

  final String code;
  final String message;
  final String? messageHi;
  final int? statusCode;
  final Object? details;

  @override
  String toString() => 'ApiException($code, $statusCode): $message';
}
