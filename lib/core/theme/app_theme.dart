import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import 'app_palette.dart';

/// The shadcn theme, plus the handful of layout constants the app agrees on.
///
/// Two constraints drive the numbers below:
///   1. The phone is cheap and often used outdoors in bright sun — contrast and
///      tap-target size matter more than density.
///   2. The copy is Devanagari, which sits taller than Latin and clips at the
///      line heights that look fine in English.
///
/// The colour scheme is the app's own rather than one of shadcn's built-ins.
/// The built-in zinc ramp is a neutral grey by design, which is correct for a
/// component gallery and wrong for a product: a screen built entirely from
/// greys and icons has nothing for the eye to land on, and reads as unfinished
/// however carefully it is laid out. See [AppPalette] for what the hues are
/// doing and why.
abstract final class AppTheme {
  /// Material's minimum is 48dp. Outdoors, with a screen protector and dry
  /// hands, 52 is noticeably more forgiving and costs nothing.
  static const double minTapTarget = 52;

  static const double pagePadding = 24;
  static const double gutter = 16;

  /// Devanagari needs more vertical room than the Latin default of ~1.2.
  static const double devanagariLineHeight = 1.45;

  // ── Corner radii ──────────────────────────────────────────────────────────
  // Named rather than typed inline, because `circular(14)` in one file and
  // `circular(16)` in the next is the kind of drift nobody ever files a bug
  // for and everybody feels.

  /// Chips, badges, inline controls.
  static const double radiusSm = 10;

  /// The default. Cards, list groups, inputs.
  static const double radiusMd = 14;

  /// Feature cards and anything holding an image.
  static const double radiusLg = 20;

  /// Hero surfaces that span the full content width.
  static const double radiusXl = 28;

  /// Aspect ratio for hero imagery. 16:10 rather than 16:9 — on a 5" phone in
  /// portrait, 16:9 leaves too little vertical room for the caption that
  /// usually sits over it.
  static const double heroAspectRatio = 16 / 10;

  static ShadThemeData get light => ShadThemeData(
        brightness: Brightness.light,
        colorScheme: const ShadColorScheme(
          background: AppPalette.sand50,
          foreground: AppPalette.ink,
          card: AppPalette.white,
          cardForeground: AppPalette.ink,
          popover: AppPalette.white,
          popoverForeground: AppPalette.ink,
          primary: AppPalette.saffron600,
          primaryForeground: AppPalette.onSaffron,
          secondary: AppPalette.sand100,
          secondaryForeground: AppPalette.sand700,
          muted: AppPalette.sand100,
          mutedForeground: AppPalette.sand600,
          accent: AppPalette.saffron100,
          accentForeground: AppPalette.saffron700,
          destructive: AppPalette.red700,
          destructiveForeground: AppPalette.onRed,
          border: AppPalette.sand200,
          input: AppPalette.sand200,
          ring: AppPalette.saffron500,
          selection: AppPalette.saffron200,
        ),
      );

  static ShadThemeData get dark => ShadThemeData(
        brightness: Brightness.dark,
        colorScheme: const ShadColorScheme(
          background: AppPalette.indigo900,
          foreground: Color(0xFFF2EDE6),
          card: AppPalette.indigo850,
          cardForeground: Color(0xFFF2EDE6),
          popover: AppPalette.indigo850,
          popoverForeground: Color(0xFFF2EDE6),
          // Brighter than the light theme's primary: on an indigo canvas the
          // deep saffron that carries white text in daylight goes muddy.
          primary: AppPalette.saffron400,
          primaryForeground: AppPalette.onSaffronDark,
          secondary: AppPalette.indigo700,
          secondaryForeground: Color(0xFFE6E1F0),
          muted: AppPalette.indigo800,
          mutedForeground: AppPalette.indigo400,
          accent: AppPalette.indigo750,
          accentForeground: AppPalette.saffron200,
          destructive: AppPalette.red500,
          destructiveForeground: AppPalette.red950,
          border: AppPalette.indigo750,
          input: AppPalette.indigo750,
          ring: AppPalette.saffron400,
          selection: Color(0xFF4A3A1A),
        ),
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

/// The decorative surfaces: gradients and shadows.
///
/// Separate from [AppTheme] because these are not part of the shadcn contract —
/// nothing in the component library reads them. They exist so that "the warm
/// hero surface" is one definition rather than a `LinearGradient` retyped in
/// four screens with slightly different stops each time.
///
/// All of them are compositor-cheap: a gradient fill and a single-layer shadow
/// cost one paint, unlike the stacked blurs and backdrop filters that make a
/// 2 GB phone drop frames while scrolling.
abstract final class AppSurfaces {
  /// The brand surface. Deep indigo into warm saffron — the app's signature,
  /// used for the splash mark, the onboarding hero and the join-community call
  /// to action.
  ///
  /// Identical in both themes on purpose: a brand surface that changes colour
  /// with the system theme is not a brand surface.
  static const LinearGradient brand = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    // The middle stop is indigo600, not indigo500, and sits at 38% rather than
    // 55%. Verified in a browser mock against the real join card: with the
    // lighter indigo held to the midpoint, a tall element spends most of its
    // height in violet — which is not a colour in this brand. Turning warm
    // earlier keeps the surface reading as indigo-into-saffron.
    colors: <Color>[
      AppPalette.indigo700,
      AppPalette.indigo600,
      AppPalette.saffron700,
    ],
    stops: <double>[0, 0.38, 1],
  );

  /// The warm surface, for cards that should feel lit rather than branded.
  static LinearGradient warm(Brightness brightness) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: brightness == Brightness.light
            ? const <Color>[AppPalette.saffron50, AppPalette.sand100]
            : const <Color>[AppPalette.indigo850, AppPalette.indigo800],
      );

  /// A top-to-bottom scrim for text laid over an image.
  ///
  /// Transparent for the top 35% so the photo is not dulled, then ramping to
  /// near-opaque ink. Without it, caption legibility depends on whatever the
  /// photographer happened to put in frame — which is to say, on luck.
  static const LinearGradient imageScrim = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: <Color>[
      Color(0x00000000),
      Color(0x40101018),
      Color(0xCC101018),
    ],
    stops: <double>[0.35, 0.66, 1],
  );

  /// One soft shadow, used for anything that should sit above the page.
  ///
  /// A single 18px blur rather than the three-layer stack a design tool
  /// exports: on a low-end GPU each shadow layer is a separate saveLayer, and
  /// the second and third are invisible at this size anyway.
  static List<BoxShadow> lift(Brightness brightness) => <BoxShadow>[
        BoxShadow(
          color: brightness == Brightness.light
              ? AppPalette.ink.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.32),
          blurRadius: 18,
          offset: const Offset(0, 6),
        ),
      ];
}
