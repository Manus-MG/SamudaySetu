import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../router/routes.dart';

/// Translates a URL the operating system handed us into an in-app location.
///
/// Four shapes reach the app and all four have to mean the same thing:
///
///   - `https://<host>/join/SURAJ-KAMAL`   — a verified App Link / Universal Link
///   - `https://<host>/invite/<token>`     — the same, for a personal invite
///   - `samudaysetu://join?code=SURAJ-KAMAL`   — the web landing page's button,
///     and the fallback on any device where verification has not happened
///   - `samudaysetu://invite?token=<token>`
///
/// Pure and static so it can be unit-tested without a platform channel, and so
/// the QR scanner can reuse it: a scanned code is the same URL arriving by a
/// different road, and two parsers would mean a link that works when tapped and
/// fails when scanned. The stateful half lives in [DeepLinkService] below.
abstract final class DeepLinkParser {
  /// The in-app path for [uri], or null when it is not ours to handle.
  ///
  /// Returning null rather than a home-screen fallback is deliberate: an
  /// unrecognised link should leave the user wherever they were, not yank them
  /// out of what they were doing.
  static String? toLocation(Uri uri) {
    final scheme = uri.scheme.toLowerCase();

    if (scheme == 'http' || scheme == 'https') {
      // Host check, not just path check. Without it, any site could publish
      // `https://evil.example/join/<code>` and — on a device where the user
      // picked this app in the "open with" dialog — drive it. The platforms are
      // meant to prevent that via verification, but a `canOpenURL` prompt or a
      // misconfigured association file makes it reachable, and the check is one
      // string comparison.
      if (uri.host.toLowerCase() != AppConfig.linkHost.toLowerCase()) return null;
      return _fromPath(uri.pathSegments);
    }

    if (scheme == AppConfig.deepLinkScheme) {
      // `samudaysetu://join?code=X` parses with `join` as the *host* and an
      // empty path. `samudaysetu://join/X` parses with `join` as the host and
      // `X` as the path. Both are in the wild — the first is what the backend
      // composes, the second is what people write by hand — so accept either by
      // rebuilding the segment list from whichever part carries the value.
      final segments = <String>[
        if (uri.host.isNotEmpty) uri.host,
        ...uri.pathSegments,
      ];

      final action = segments.isEmpty ? '' : segments.first.toLowerCase();
      final query = uri.queryParameters;

      if (action == 'join') {
        final code = query['code'] ?? (segments.length > 1 ? segments[1] : null);
        return _joinLocation(code);
      }
      if (action == 'invite') {
        final token = query['token'] ?? (segments.length > 1 ? segments[1] : null);
        return _inviteLocation(token);
      }
    }

    return null;
  }

  static String? _fromPath(List<String> segments) {
    if (segments.length < 2) return null;

    switch (segments.first.toLowerCase()) {
      case 'join':
        return _joinLocation(segments[1]);
      case 'invite':
        return _inviteLocation(segments[1]);
      default:
        return null;
    }
  }

  /// Re-encodes on the way in. The value arrives percent-decoded from [Uri], and
  /// dropping it into a path string unencoded would break any code containing a
  /// character go_router treats as a separator.
  static String? _joinLocation(String? code) {
    final value = code?.trim() ?? '';
    if (value.isEmpty) return null;
    return AppRoutes.joinWithCode(Uri.encodeComponent(value));
  }

  static String? _inviteLocation(String? token) {
    final value = token?.trim() ?? '';
    if (value.isEmpty) return null;
    return AppRoutes.inviteWithToken(Uri.encodeComponent(value));
  }
}

/// Listens for links from the OS for the lifetime of the app.
///
/// Cold start and warm start are handled differently on purpose:
///
///   - **Cold start** parks the destination in [onColdStart] instead of
///     navigating. At that moment the router has not built its first route and
///     the session is still being restored from secure storage, so a `go()`
///     would either be dropped or would land on a screen the redirect is about
///     to replace. Parking lets the existing redirect — which already knows how
///     to replay a destination once there is a session — do the work.
///   - **Warm start** navigates immediately via [onLink]. The app is on screen,
///     the session is settled, and any auth requirement is handled by the same
///     redirect.
class DeepLinkService {
  DeepLinkService({
    required void Function(String location) onLink,
    required void Function(String location) onColdStart,
    AppLinks? appLinks,
  })  : _onLink = onLink,
        _onColdStart = onColdStart,
        _appLinks = appLinks ?? AppLinks();

  final void Function(String location) _onLink;
  final void Function(String location) _onColdStart;
  final AppLinks _appLinks;

  StreamSubscription<Uri>? _subscription;
  bool _hasStarted = false;

  /// Begins listening. Safe to call more than once; only the first call binds.
  Future<void> start() async {
    if (_hasStarted) return;
    _hasStarted = true;

    // Subscribe *before* awaiting the initial link. The other order has a window
    // in which a link arriving during the await is never delivered — rare, and
    // exactly the kind of bug that only reproduces on a slow phone.
    _subscription = _appLinks.uriLinkStream.listen(
      (uri) {
        final location = DeepLinkParser.toLocation(uri);
        if (location != null) _onLink(location);
      },
      // A dead stream must not take the app with it. Links stop working; nothing
      // else does, and the code entry screen is still there.
      onError: (Object error) => _report('stream', error),
    );

    try {
      final initial = await _appLinks.getInitialLink();
      if (initial == null) return;

      final location = DeepLinkParser.toLocation(initial);
      if (location != null) _onColdStart(location);
    } on Object catch (error) {
      _report('initial link', error);
    }
  }

  Future<void> dispose() async {
    await _subscription?.cancel();
    _subscription = null;
  }

  void _report(String what, Object error) {
    if (!kDebugMode) return;
    debugPrint('[deeplink] $what failed: $error');
  }
}
