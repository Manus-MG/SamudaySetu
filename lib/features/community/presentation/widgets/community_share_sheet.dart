import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/share/share_channel.dart';
import '../../../../core/share/share_launcher.dart';
import '../../../../core/share/share_payload.dart';
import '../../../../core/theme/app_theme.dart';

/// Every way to pass a join code on, in one component, used by both ends.
///
/// A leader embeds it in a full screen with the code-rotation controls attached
/// beneath; a member opens it as a bottom sheet from their community screen.
/// The channels, the QR and the wording are identical in both places, and that
/// is the point — a member forwarding an invite to a neighbour is the platform's
/// main growth path, and giving them a worse version of the leader's tools makes
/// the common case the weaker one.
///
/// Stateless and driven entirely by [payload]: the strings are composed on the
/// server and the QR arrives rendered, so there is nothing here to hold.
class CommunityShareSheet extends StatelessWidget {
  const CommunityShareSheet({
    super.key,
    required this.payload,
    this.showQr = true,
    this.footer,
  });

  final SharePayload payload;

  /// False in the compact bottom-sheet layout, where the QR would push the
  /// channels below the fold on a 5" screen — and where the user is sharing
  /// remotely anyway, so a QR on their own screen helps nobody.
  final bool showQr;

  /// Extra controls owned by the caller. The leader passes the rotate block; a
  /// member passes nothing.
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    // The QR channel is dropped rather than disabled when there is no image.
    // A greyed-out tile asks the user to work out why; an absent one asks
    // nothing, and the remaining channels all still carry the code.
    final channels = ShareChannel.values
        .where((channel) => !channel.requiresQr || payload.hasQr)
        .toList(growable: false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (showQr) ...<Widget>[
          _QrPlate(payload: payload),
          const SizedBox(height: 24),
        ],
        _ChannelGrid(channels: channels, payload: payload),
        const SizedBox(height: 24),
        _CodePlate(payload: payload),
        if (footer != null) ...<Widget>[
          const SizedBox(height: 16),
          footer!,
        ],
      ],
    );
  }
}

/// Opens the share sheet as a modal.
///
/// The only bottom sheet in the app, and it earns the exception: the member's
/// community screen is a hub they came to for something else, so sharing has to
/// be reachable without taking the screen away from them. A pushed route would
/// mean a back stack for what is one tap and a dismissal.
Future<void> showCommunityShareSheet(
  BuildContext context, {
  required SharePayload payload,
}) {
  final theme = ShadTheme.of(context);

  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: theme.colorScheme.background,
    // The channel grid plus the code plate overflows a half-height sheet on a
    // 5" screen; without this the content is clipped rather than scrolled.
    isScrollControlled: true,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusXl)),
    ),
    builder: (context) => SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          AppTheme.pagePadding,
          0,
          AppTheme.pagePadding,
          AppTheme.pagePadding,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(
              'किसी और को जोड़ें',
              textAlign: TextAlign.center,
              style: theme.textTheme.h4.copyWith(height: AppTheme.devanagariLineHeight),
            ),
            const SizedBox(height: 4),
            Text(
              'जिसे भेजेंगे वे बस लिंक दबाएँगे — कोई कोड डालने की ज़रूरत नहीं।',
              textAlign: TextAlign.center,
              style: theme.textTheme.muted.copyWith(height: AppTheme.devanagariLineHeight),
            ),
            const SizedBox(height: 24),
            CommunityShareSheet(payload: payload, showQr: false),
          ],
        ),
      ),
    ),
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

class _QrPlate extends StatelessWidget {
  const _QrPlate({required this.payload});

  final SharePayload payload;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final bytes = payload.qrPngBytes;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: <Widget>[
          if (bytes != null)
            // White plate behind the code: on a dark theme the quiet zone would
            // otherwise sit against a dark background and stop scanning.
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Image.memory(
                bytes,
                width: 220,
                height: 220,
                // The source is one pixel per module scaled up; smoothing it
                // blurs the edges a scanner relies on.
                filterQuality: FilterQuality.none,
                gaplessPlayback: true,
              ),
            )
          else
            Text(
              'QR नहीं बन पाया — नीचे दिया कोड इस्तेमाल करें।',
              textAlign: TextAlign.center,
              style: theme.textTheme.muted.copyWith(
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          const SizedBox(height: 14),
          Text(
            'सामने वाले से कहें कि ऐप में “QR स्कैन करें” दबाकर इसे स्कैन करें।',
            textAlign: TextAlign.center,
            style: theme.textTheme.muted.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
        ],
      ),
    );
  }
}

/// The channel tiles, four to a row.
///
/// A `Wrap` over sized tiles rather than a `GridView`: this sits inside a
/// scrolling parent in both layouts, and a nested scrollable there needs
/// `shrinkWrap` plus a disabled physics to behave — at which point it is a
/// `Wrap` with extra steps and a worse layout pass.
class _ChannelGrid extends StatelessWidget {
  const _ChannelGrid({required this.channels, required this.payload});

  final List<ShareChannel> channels;
  final SharePayload payload;

  static const int _columns = 4;
  static const double _spacing = 8;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Derived from the available width rather than fixed, so the tiles fill
        // a 5" screen and a tablet without a second breakpoint.
        final width =
            (constraints.maxWidth - _spacing * (_columns - 1)) / _columns;

        return Wrap(
          spacing: _spacing,
          runSpacing: 16,
          children: <Widget>[
            for (final channel in channels)
              SizedBox(
                width: width,
                child: _ChannelTile(channel: channel, payload: payload),
              ),
          ],
        );
      },
    );
  }
}

class _ChannelTile extends StatelessWidget {
  const _ChannelTile({required this.channel, required this.payload});

  final ShareChannel channel;
  final SharePayload payload;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final brand = channel.brandColor;

    return Semantics(
      button: true,
      label: channel.hint == null ? channel.label : '${channel.label} — ${channel.hint}',
      child: InkWell(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        // `context` here is the tile's, which is what anchors the iPad share
        // popover to the thing the user actually pressed. Passing the screen's
        // context instead makes UIKit throw.
        onTap: () => unawaited(ShareLauncher.send(context, channel, payload)),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Container(
                height: 52,
                width: 52,
                decoration: BoxDecoration(
                  color: brand ?? theme.colorScheme.muted,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  channel.icon,
                  size: 24,
                  color: brand == null ? theme.colorScheme.foreground : Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                channel.label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.muted.copyWith(
                  height: AppTheme.devanagariLineHeight,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The code itself, one chip per word.
///
/// Last, and quietly styled, because reading a code down a phone line is the
/// worst of the paths above it. It stays because it is the only one that works
/// when the other person is not holding a smartphone.
class _CodePlate extends StatelessWidget {
  const _CodePlate({required this.payload});

  final SharePayload payload;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final spoken = payload.codeSpoken;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: <Widget>[
          Text(
            'या कोड बताएँ',
            style: theme.textTheme.muted.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
          const SizedBox(height: 10),
          // Someone reading this out needs to see where one word ends and the
          // next begins, which a single run of characters does not show.
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              for (final word in payload.code.split('-').where((w) => w.isNotEmpty))
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.background,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: theme.colorScheme.border),
                  ),
                  child: Text(
                    word,
                    style: theme.textTheme.h4.copyWith(letterSpacing: 1.5),
                  ),
                ),
            ],
          ),
          if (spoken != null) ...<Widget>[
            const SizedBox(height: 10),
            Text(
              spoken,
              style: theme.textTheme.large.copyWith(
                height: AppTheme.devanagariLineHeight,
                color: theme.colorScheme.mutedForeground,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
