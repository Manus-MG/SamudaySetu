import 'dart:typed_data';

/// *What* is being shared, with no opinion about *how*.
///
/// The server composes every string in here — see `buildShareMessage` in
/// `backend/src/modules/communities/joinCode.ts`. That is deliberate and it is
/// the reason this class holds text rather than the parts to build it from: the
/// wording of an invite is a product decision that has to read identically on
/// Android, on iOS and in the web console, and three clients each assembling
/// their own sentence is three chances for one of them to be wrong.
///
/// Kept in `core` and free of any feature import so that the share machinery
/// does not depend on the community feature. The conversion from a `JoinKit`
/// lives on the feature side, pointing inwards.
class SharePayload {
  const SharePayload({
    required this.subject,
    required this.message,
    required this.url,
    required this.code,
    this.codeSpoken,
    this.qrPngBytes,
  });

  /// Used where a channel has a separate title field — the subject line of an
  /// email, the file name of a shared QR. Never shown on its own.
  final String subject;

  /// The full invitation: greeting, link and the code written out. This is what
  /// travels in a WhatsApp message.
  final String message;

  /// The join link on its own, for "copy link" and for channels that want a URL
  /// rather than prose.
  final String url;

  /// Display form of the code, `SURAJ-KAMAL`.
  final String code;

  /// The same code in Devanagari, `सूरज-कमल`, when it is a generated word pair.
  /// Null for a leader's custom code, which has no transliteration.
  final String? codeSpoken;

  /// The QR as PNG bytes, already decoded. Null when the server could not render
  /// one — the code and the link still work, so this is a missing nicety rather
  /// than a failure.
  final Uint8List? qrPngBytes;

  /// Whether the QR can be shown or attached to a message.
  bool get hasQr => qrPngBytes != null;

  /// A file name a recipient can make sense of in their downloads folder.
  ///
  /// ASCII only and derived from the code rather than the community name: the
  /// name is Devanagari, and a Devanagari file name arrives mangled or truncated
  /// on a surprising number of Android file managers and mail clients.
  String get qrFileName {
    final safe = code.replaceAll(RegExp('[^0-9A-Za-z-]'), '');
    return 'samuday-setu-${safe.isEmpty ? 'qr' : safe.toLowerCase()}.png';
  }
}
