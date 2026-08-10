import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

/// The shadcn theme, plus the handful of layout constants the app agrees on.
///
/// Two constraints drive the numbers below:
///   1. The phone is cheap and often used outdoors in bright sun — contrast and
///      tap-target size matter more than density.
///   2. The copy is Devanagari, which sits taller than Latin and clips at the
///      line heights that look fine in English.
abstract final class AppTheme {
  /// Material's minimum is 48dp. Outdoors, with a screen protector and dry
  /// hands, 52 is noticeably more forgiving and costs nothing.
  static const double minTapTarget = 52;

  static const double pagePadding = 24;
  static const double gutter = 16;

  /// Devanagari needs more vertical room than the Latin default of ~1.2.
  static const double devanagariLineHeight = 1.45;

  static ShadThemeData get light => ShadThemeData(
        brightness: Brightness.light,
        colorScheme: const ShadZincColorScheme.light(),
      );

  static ShadThemeData get dark => ShadThemeData(
        brightness: Brightness.dark,
        colorScheme: const ShadZincColorScheme.dark(),
      );

  /// Material widgets still render underneath the shadcn ones — `Scaffold`,
  /// scrollbars, text selection. Deriving from the `ThemeData` that `ShadApp`
  /// already built keeps the two palettes from drifting instead of
  /// hand-maintaining a second one.
  static ThemeData materialFrom(ThemeData base) => base.copyWith(
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: <TargetPlatform, PageTransitionsBuilder>{
            // Routes declare their own transitions; this is only the fallback
            // for anything pushed outside go_router.
            TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
            TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          },
        ),
      );
}
