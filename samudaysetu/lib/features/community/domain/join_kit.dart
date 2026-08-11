import 'dart:convert';
import 'dart:typed_data';

/// Everything a leader needs to get people through the door, in one object.
///
/// Mirrors `JoinKitDto` in `backend/src/modules/communities/communities.types.ts`.
class JoinKit {
  const JoinKit({
    required this.communityId,
    required this.communityName,
    required this.joinCode,
    required this.joinCodeWords,
    required this.joinCodeIsCustom,
    required this.joinUrl,
    required this.deepLink,
    required this.shareMessage,
    required this.whatsAppUrl,
    this.joinCodeHindi,
    this.qrPngBytes,
  });

  factory JoinKit.fromJson(Map<String, dynamic> json) => JoinKit(
        communityId: json['communityId'] as String? ?? '',
        communityName: json['communityName'] as String? ?? '',
        joinCode: json['joinCode'] as String? ?? '',
        joinCodeWords:
            (json['joinCodeWords'] as List<dynamic>? ?? const <dynamic>[])
                .map((word) => word.toString())
                .toList(growable: false),
        joinCodeIsCustom: json['joinCodeIsCustom'] as bool? ?? false,
        joinUrl: json['joinUrl'] as String? ?? '',
        deepLink: json['deepLink'] as String? ?? '',
        shareMessage: json['shareMessage'] as String? ?? '',
        whatsAppUrl: json['whatsAppUrl'] as String? ?? '',
        joinCodeHindi: json['joinCodeHindi'] as String?,
        qrPngBytes: _decodeDataUrl(json['qrPngDataUrl'] as String?),
      );

  /// Turns `data:image/png;base64,…` into bytes for `Image.memory`.
  ///
  /// Decoded once here rather than on every rebuild: base64 of a ~450-byte PNG is
  /// cheap, but doing it inside `build` would redo it on every frame of an
  /// animation, and this screen animates in.
  static Uint8List? _decodeDataUrl(String? dataUrl) {
    if (dataUrl == null) return null;
    final separator = dataUrl.indexOf(',');
    if (separator < 0) return null;
    try {
      return base64Decode(dataUrl.substring(separator + 1));
    } on FormatException {
      // A malformed QR is not worth failing the whole screen for — the code and
      // the link below it are the parts that actually matter.
      return null;
    }
  }

  final String communityId;
  final String communityName;

  /// Display form with word boundaries: `SURAJ-KAMAL`.
  final String joinCode;

  /// The words on their own, so the UI can show one per chip.
  final List<String> joinCodeWords;

  /// `सूरज-कमल`, or null when the leader chose a custom code.
  final String? joinCodeHindi;

  final bool joinCodeIsCustom;
  final String joinUrl;
  final String deepLink;
  final String shareMessage;

  /// `wa.me` link with the message already composed.
  final String whatsAppUrl;

  /// PNG rather than SVG so it renders without `flutter_svg`.
  final Uint8List? qrPngBytes;
}

/// The server's verdict on a proposed custom code.
class JoinCodeAvailability {
  const JoinCodeAvailability({
    required this.code,
    required this.available,
    this.codeHindi,
    this.reason,
    this.reasonHi,
  });

  factory JoinCodeAvailability.fromJson(Map<String, dynamic> json) => JoinCodeAvailability(
        code: json['code'] as String? ?? '',
        available: json['available'] as bool? ?? false,
        codeHindi: json['codeHindi'] as String?,
        reason: json['reason'] as String?,
        reasonHi: json['reasonHi'] as String?,
      );

  final String code;
  final bool available;
  final String? codeHindi;
  final String? reason;
  final String? reasonHi;

  /// Hindi first, matching the app's default locale.
  String? get displayReason => reasonHi ?? reason;
}
