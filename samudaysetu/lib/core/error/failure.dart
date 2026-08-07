/// Domain-level error. The presentation layer only ever sees a [Failure];
/// `DioException` and platform exceptions stop at the data layer.
sealed class Failure implements Exception {
  const Failure(this.message, {this.messageHi, this.code});

  final String message;
  final String? messageHi;
  final String? code;

  /// Hindi is the default locale of the app, so prefer the Hindi copy when present.
  String get displayMessage => messageHi ?? message;

  @override
  String toString() => '$runtimeType(code: $code, message: $message)';
}

final class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'No internet connection'])
      : super(messageHi: 'इंटरनेट कनेक्शन उपलब्ध नहीं है');
}

final class TimeoutFailure extends Failure {
  const TimeoutFailure([super.message = 'The request timed out'])
      : super(messageHi: 'अनुरोध का समय समाप्त हो गया');
}

final class ServerFailure extends Failure {
  const ServerFailure(super.message, {super.messageHi, super.code, this.statusCode});
  final int? statusCode;
}

final class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure([super.message = 'Please sign in again'])
      : super(messageHi: 'कृपया दोबारा साइन इन करें', code: 'UNAUTHENTICATED');
}

final class CacheFailure extends Failure {
  const CacheFailure([super.message = 'Local data could not be read']);
}

final class UnknownFailure extends Failure {
  const UnknownFailure([super.message = 'Something went wrong'])
      : super(messageHi: 'कुछ गलत हो गया');
}
