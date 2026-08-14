import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Stable, machine-readable error codes.
/// Mirrors `backend/src/core/errors/errorCodes.ts` — branch on these, never on
/// the human-readable message.
abstract final class ApiErrorCode {
  static const String validationFailed = 'VALIDATION_FAILED';
  static const String unauthenticated = 'UNAUTHENTICATED';
  static const String tokenExpired = 'TOKEN_EXPIRED';
  static const String invalidCredentials = 'INVALID_CREDENTIALS';
  static const String sessionRevoked = 'SESSION_REVOKED';
  static const String accountSuspended = 'ACCOUNT_SUSPENDED';
  static const String otpInvalid = 'OTP_INVALID';
  static const String otpExpired = 'OTP_EXPIRED';
  static const String otpLocked = 'OTP_LOCKED';
  static const String forbidden = 'FORBIDDEN';
  static const String notFound = 'NOT_FOUND';
  static const String conflict = 'CONFLICT';
  static const String rateLimited = 'RATE_LIMITED';
  static const String serviceUnavailable = 'SERVICE_UNAVAILABLE';
  static const String internal = 'INTERNAL';
}

/// A failure as the UI understands it.
///
/// One class, not a hierarchy: the screens branch on [code], and every extra
/// subclass would be one more thing for a `switch` to forget. `DioException`
/// stops at the data layer and never travels above it.
class ApiFailure implements Exception {
  const ApiFailure({
    required this.code,
    required this.message,
    this.messageHi,
    this.statusCode,
    this.details,
  });

  /// Parses the failure half of the envelope:
  /// `{ success: false, error: { code, message, messageHi, details } }`.
  factory ApiFailure.fromEnvelope(Object? body, {int? statusCode}) {
    if (body is Map && body['error'] is Map) {
      final error = body['error'] as Map;
      return ApiFailure(
        code: error['code'] as String? ?? ApiErrorCode.internal,
        message: error['message'] as String? ?? _genericEn,
        messageHi: error['messageHi'] as String?,
        statusCode: statusCode,
        details: error['details'],
      );
    }
    return ApiFailure(
      code: ApiErrorCode.internal,
      message: _genericEn,
      messageHi: _genericHi,
      statusCode: statusCode,
    );
  }

  /// Normalises **anything** into a failure the UI can show.
  ///
  /// The contract is absolute: this never throws, for any input. An error
  /// handler that can itself fail turns a diagnosable problem into a button that
  /// silently does nothing — the caller's `catch` does not match, the exception
  /// escapes past the `finally` that resets the spinner, and the user is left
  /// with no feedback at all.
  ///
  /// That is not hypothetical: this function used to throw `UnimplementedError`
  /// on one `DioExceptionType`, and every screen catches only `ApiFailure`.
  ///
  /// It also accepts non-Dio errors — a `TypeError` from a response whose shape
  /// drifted, for instance — so screens can funnel their whole `catch` through
  /// it rather than only handling the failures they anticipated.
  factory ApiFailure.from(Object error) {
    if (error is ApiFailure) return error;

    if (error is DioException) {
      // The interceptor may already have attached a parsed failure.
      final attached = error.error;
      if (attached is ApiFailure) return attached;

      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return const ApiFailure(
            code: ApiErrorCode.serviceUnavailable,
            message: 'The request timed out. Check your connection.',
            messageHi: 'अनुरोध का समय समाप्त हो गया। कृपया कनेक्शन जाँचें।',
          );
        case DioExceptionType.connectionError:
        case DioExceptionType.badCertificate:
          return const ApiFailure(
            code: ApiErrorCode.serviceUnavailable,
            message: 'Cannot reach the server. Check your internet connection.',
            messageHi: 'सर्वर से संपर्क नहीं हो पा रहा। कृपया इंटरनेट जाँचें।',
          );
        case DioExceptionType.badResponse:
          return ApiFailure.fromEnvelope(
            error.response?.data,
            statusCode: error.response?.statusCode,
          );
        case DioExceptionType.cancel:
        case DioExceptionType.unknown:
        case DioExceptionType.transformTimeout:
          // `transformTimeout` belongs here rather than with the other timeouts:
          // it means Dio's response *decoder* stalled, not the network, so
          // "check your connection" would be actively misleading advice.
          //
          // It previously threw `UnimplementedError`. That is the worst possible
          // behaviour for this function — see the guarantee documented above.
          return const ApiFailure(
            code: ApiErrorCode.internal,
            message: _genericEn,
            messageHi: _genericHi,
          );
      }
    }

    return const ApiFailure(
      code: ApiErrorCode.internal,
      message: _genericEn,
      messageHi: _genericHi,
    );
  }

  static const String _genericEn = 'Something went wrong. Please try again.';
  static const String _genericHi = 'कुछ गड़बड़ हुई। कृपया दोबारा प्रयास करें।';

  final String code;
  final String message;
  final String? messageHi;
  final int? statusCode;
  final Object? details;

  /// The app is Hindi-first, so prefer the Hindi copy the server sent.
  String get displayMessage => messageHi ?? message;

  /// The Hindi message plus, **in debug builds only**, the status and error code.
  ///
  /// A member must never be shown `[404 NOT_FOUND]`; a developer staring at an
  /// emulator wondering why a correct-looking code is rejected needs exactly
  /// that. `kDebugMode` is a compile-time constant, so the branch and the string
  /// are both tree-shaken out of a release build.
  String get debugDisplayMessage {
    if (!kDebugMode) return displayMessage;

    final status = statusCode == null ? '' : '$statusCode ';
    return '$displayMessage\n\n[$status$code]  ·  $message';
  }

  /// True when the code means "this OTP attempt failed", as opposed to "the
  /// request never got there" — the OTP screen shakes for one and not the other.
  bool get isOtpRejection =>
      code == ApiErrorCode.otpInvalid ||
      code == ApiErrorCode.otpExpired ||
      code == ApiErrorCode.otpLocked;

  /// Attempts left before lockout, when the server chose to tell us.
  int? get attemptsRemaining {
    final data = details;
    if (data is Map && data['attemptsRemaining'] is int) {
      return data['attemptsRemaining'] as int;
    }
    return null;
  }

  @override
  String toString() => 'ApiFailure($code${statusCode == null ? '' : ' $statusCode'}): $message';
}
