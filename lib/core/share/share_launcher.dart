import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import 'share_actions.dart';
import 'share_channel.dart';
import 'share_payload.dart';

/// What actually happened, so a caller can decide whether to dismiss its sheet.
enum ShareOutcome {
  /// The invite left the app, or at least reached the app that will send it.
  /// The OS share sheet reports success the moment it opens, so this means
  /// "handed over", never "delivered".
  handedOver,

  /// The channel could not be opened and the content is on the clipboard
  /// instead. The user has been told.
  copied,

  /// Nothing could be done. The user has been told.
  failed,
}

/// Turns a [ShareChannel] and a [SharePayload] into something leaving the phone.
///
/// One dispatcher rather than a share method per screen, because the failure
/// handling is the hard part and it is identical everywhere: WhatsApp may not be
/// installed, Android 11+ package visibility may hide it, a work profile may
/// block the intent, and the share sheet may be dismissed. Every one of those
/// looks the same to the user — a button that did nothing — unless the fallback
/// is written once and used by all of them.
///
/// Nothing here throws. A share button that raises an exception in release is
/// strictly worse than one that copies to the clipboard and says so.
abstract final class ShareLauncher {
  /// Sends [payload] over [channel], falling back to the clipboard.
  ///
  /// [context] is used for the confirmation snackbar and, on iPad, to anchor the
  /// share popover to the widget that was tapped — omit that and UIKit raises
  /// rather than guessing.
  static Future<ShareOutcome> send(
    BuildContext context,
    ShareChannel channel,
    SharePayload payload,
  ) async {
    switch (channel) {
      case ShareChannel.system:
        return _system(context, payload);
      case ShareChannel.qrImage:
        return _qrImage(context, payload);
      case ShareChannel.whatsApp:
        return _external(context, _whatsAppUrl(payload), payload.message);
      case ShareChannel.sms:
        return _external(context, _smsUrl(payload), payload.message);
      case ShareChannel.email:
        return _external(context, _emailUrl(payload), payload.message);
      case ShareChannel.copyLink:
        await ShareActions.copy(context, payload.url, label: 'लिंक कॉपी हो गया');
        return ShareOutcome.copied;
      case ShareChannel.copyCode:
        await ShareActions.copy(context, payload.code, label: 'कोड कॉपी हो गया');
        return ShareOutcome.copied;
    }
  }

  // ── The OS share sheet ─────────────────────────────────────────────────────

  static Future<ShareOutcome> _system(BuildContext context, SharePayload payload) async {
    final origin = _popoverOrigin(context);

    try {
      await Share.share(payload.message, subject: payload.subject, sharePositionOrigin: origin);
      return ShareOutcome.handedOver;
    } on Object catch (error, stack) {
      // `Object`, not `PlatformException`: the plugin surfaces a `MissingPlugin`
      // error on a stale hot restart and a raw channel error on some OEM ROMs,
      // and neither should reach the user as a crash when the clipboard works.
      _report(error, stack, 'share sheet');
      if (!context.mounted) return ShareOutcome.failed;

      await ShareActions.copy(
        context,
        payload.message,
        label: 'शेयर नहीं हो पाया — संदेश कॉपी कर दिया गया',
      );
      return ShareOutcome.copied;
    }
  }

  // ── The QR, as a picture ───────────────────────────────────────────────────

  static Future<ShareOutcome> _qrImage(BuildContext context, SharePayload payload) async {
    final bytes = payload.qrPngBytes;

    // The UI hides this channel when there is no QR, so reaching here means the
    // kit was refreshed between build and tap. Copy rather than no-op.
    if (bytes == null) {
      await ShareActions.copy(
        context,
        payload.message,
        label: 'QR नहीं बन पाया — संदेश कॉपी कर दिया गया',
      );
      return ShareOutcome.copied;
    }

    final origin = _popoverOrigin(context);

    try {
      // The cache directory, not documents: this file exists to be handed to
      // another app and the OS may reclaim it afterwards. Writing it to
      // documents would leave a QR per rotation on a phone with 8 GB of storage.
      final directory = await getTemporaryDirectory();
      final file = File('${directory.path}/${payload.qrFileName}');
      await file.writeAsBytes(bytes, flush: true);

      if (!context.mounted) return ShareOutcome.failed;

      await Share.shareXFiles(
        <XFile>[XFile(file.path, mimeType: 'image/png', name: payload.qrFileName)],
        // The text rides along with the image so a recipient who cannot scan it
        // — because they are reading on the same phone it was sent from — still
        // has the link and the code.
        text: payload.message,
        subject: payload.subject,
        sharePositionOrigin: origin,
      );
      return ShareOutcome.handedOver;
    } on Object catch (error, stack) {
      _report(error, stack, 'QR share');
      if (!context.mounted) return ShareOutcome.failed;

      await ShareActions.copy(
        context,
        payload.message,
        label: 'QR नहीं भेजा जा सका — संदेश कॉपी कर दिया गया',
      );
      return ShareOutcome.copied;
    }
  }

  // ── Single-app channels ────────────────────────────────────────────────────

  /// Opens [url], and copies [fallback] when that is not possible.
  static Future<ShareOutcome> _external(
    BuildContext context,
    String url,
    String fallback,
  ) async {
    final opened = await ShareActions.openExternal(url);
    if (opened) return ShareOutcome.handedOver;
    if (!context.mounted) return ShareOutcome.failed;

    await ShareActions.copy(
      context,
      fallback,
      label: 'ऐप नहीं खुल पाया — संदेश कॉपी कर दिया गया',
    );
    return ShareOutcome.copied;
  }

  /// `wa.me` rather than the `whatsapp://` scheme.
  ///
  /// The custom scheme opens marginally faster and fails hard when WhatsApp is
  /// absent; the https form degrades into a browser page that offers to install
  /// it. For a first-time recipient that difference is the whole funnel.
  static String _whatsAppUrl(SharePayload payload) =>
      'https://wa.me/?text=${Uri.encodeComponent(payload.message)}';

  /// The two platforms disagree about the separator before the first parameter
  /// when there is no recipient: Android wants `?`, iOS wants `&`. Getting it
  /// wrong does not error — it opens the composer with an empty body, which is
  /// the kind of bug that survives review because the app did open.
  static String _smsUrl(SharePayload payload) {
    final separator = defaultTargetPlatform == TargetPlatform.iOS ? '&' : '?';
    return 'sms:$separator' 'body=${Uri.encodeComponent(payload.message)}';
  }

  static String _emailUrl(SharePayload payload) =>
      'mailto:?subject=${Uri.encodeComponent(payload.subject)}'
      '&body=${Uri.encodeComponent(payload.message)}';

  // ── Plumbing ───────────────────────────────────────────────────────────────

  /// The rectangle an iPad popover points at: the bounds of the tapped widget.
  ///
  /// Null on a phone is fine and expected. Null on an iPad makes UIKit throw, so
  /// callers pass the context of the button rather than of the screen.
  static Rect? _popoverOrigin(BuildContext context) {
    final box = context.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return null;
    return box.localToGlobal(Offset.zero) & box.size;
  }

  static void _report(Object error, StackTrace stack, String what) {
    if (!kDebugMode) return;
    debugPrint('[share] $what failed: $error\n$stack');
  }
}
