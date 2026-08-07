/// Mirrors the backend envelope `{ success, data, error }`. One shape forever.
class ApiResponse<T> {
  const ApiResponse({required this.data, this.meta});

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? data) parse,
  ) {
    return ApiResponse<T>(
      data: parse(json['data']),
      meta: json['meta'] as Map<String, dynamic>?,
    );
  }

  final T data;
  final Map<String, dynamic>? meta;
}
