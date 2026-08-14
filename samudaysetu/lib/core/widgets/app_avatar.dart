import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../theme/app_palette.dart';

/// An identity avatar: initials on a gradient chosen from the member's own
/// identifier.
///
/// Replaces the grey circle. A members list where every row is the same grey
/// disc is a list the eye cannot scan — colour is what lets someone find the
/// person they already scrolled past once. And because the colour is derived
/// rather than stored, it needs no upload, no photo API and no bytes over the
/// wire, which is the only version of this feature that works on 2G.
///
/// The colour is *stable*: the same member is the same colour on every device,
/// every launch and every screen. That is a promise the implementation has to
/// keep deliberately — see [_stableHash].
class AppAvatar extends StatelessWidget {
  const AppAvatar({
    required this.initials,
    required this.seed,
    this.size = 48,
    super.key,
  });

  /// One or two characters. Devanagari initials are wide, so the type scale
  /// below is set from the glyph height rather than a Latin cap height.
  final String initials;

  /// What the colour is derived from. Pass something that does not change —
  /// a user id, or the phone number — never the display name, or the avatar
  /// changes colour the day someone fixes a typo in their name.
  final String seed;

  final double size;

  /// FNV-1a, 32-bit.
  ///
  /// `String.hashCode` would be the obvious choice and is the wrong one: Dart
  /// makes no guarantee that it is stable across releases or platforms, so the
  /// same member could be orange on one build and indigo on the next. This is
  /// eleven lines to make the mapping a fact rather than a coincidence.
  static int _stableHash(String value) {
    int hash = 0x811C9DC5;
    for (final int unit in value.codeUnits) {
      hash ^= unit;
      // Kept inside 32 bits by hand; Dart ints are 64-bit natively and would
      // otherwise drift away from the reference implementation.
      hash = (hash * 0x01000193) & 0xFFFFFFFF;
    }
    return hash;
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final (Color from, Color to) = AppPalette
        .avatarPairs[_stableHash(seed) % AppPalette.avatarPairs.length];

    return Container(
      height: size,
      width: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[from, to],
        ),
      ),
      child: Text(
        initials,
        maxLines: 1,
        style: theme.textTheme.large.copyWith(
          // Every gradient in `avatarPairs` is dark enough that this clears
          // 4.5:1 against its *lighter* stop, so this is safe unconditionally.
          color: AppPalette.onSaffron,
          fontSize: size * 0.36,
          height: 1,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
