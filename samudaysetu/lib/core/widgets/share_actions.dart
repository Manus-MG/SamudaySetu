import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

/// Opening other apps, and the fallback for when that fails.
///
/// `launchUrl` returns false, or throws, more often than its API suggests:
/// WhatsApp may not be installed, Android 11+ package visibility may hide it,
/// and a work profile may block it outright. Every one of those looks identical
/// to the user — a button that does nothing — so every path here ends in either
/// the app opening or a message saying what happened.
abstract final class ShareActions {
  /// Opens a URL in the appropriate external app.
  ///
  /// Returns false when it could not, so the caller can fall back to the
  /// clipboard rather than leaving the user staring at an unchanged screen.
  static Future<bool> openExternal(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;

    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } on PlatformException {
      return false;
    }
  }

  /// Copies text and confirms it, because a silent clipboard write is
  /// indistinguishable from a broken button.
  static Future<void> copy(
    BuildContext context,
    String value, {
    String label = 'कॉपी हो गया',
  }) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (!context.mounted) return;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(label),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  /// Tries to open the URL and copies it instead when that fails.
  ///
  /// This is the one a share button should call: the user either lands in
  /// WhatsApp or is told the link is on their clipboard, and never gets nothing.
  static Future<void> openOrCopy(
    BuildContext context,
    String url, {
    String fallbackLabel = 'ऐप नहीं खुल पाया — लिंक कॉपी कर दिया गया',
  }) async {
    final opened = await openExternal(url);
    if (opened || !context.mounted) return;

    await copy(context, url, label: fallbackLabel);
  }
}
