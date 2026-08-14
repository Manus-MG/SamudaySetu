import 'package:flutter/painting.dart';

/// The raw brand colours, as data.
///
/// Only `app_theme.dart` and the illustration primitives should import this —
/// everywhere else reads `ShadTheme.of(context).colorScheme`, so a palette
/// change is one edit rather than a search-and-replace.
///
/// Every value is a fixed stop on one of three ramps rather than a colour
/// picked per component. A palette assembled one screen at a time is how an app
/// ends up with nine greys and no identity.
///
/// Two constraints chose the ramps:
///
///  1. **Sunlight.** The target phone is used outdoors. Every foreground /
///     background pair the theme derives from these stops clears WCAG AA
///     (4.5:1); most clear AAA. That is verified, not assumed — see
///     `test/core/theme/app_palette_contrast_test.dart`.
///  2. **Warmth.** Saffron and marigold read as familiar and civic to the
///     audience this is built for. Indigo supplies depth a single warm hue
///     cannot, and keeps the dark theme from looking like a brown wash over
///     black. Sand is the neutral — warm-tinted, never a pure grey, because
///     pure grey next to saffron reads as dirty.
abstract final class AppPalette {
  // ── Saffron: the brand hue. Actions, emphasis, brand marks. ────────────────
  static const Color saffron50 = Color(0xFFFEF7EC);
  static const Color saffron100 = Color(0xFFFBEBD0);
  static const Color saffron200 = Color(0xFFF7D6A1);
  static const Color saffron300 = Color(0xFFF2BA63);
  static const Color saffron400 = Color(0xFFEC9F2E);
  static const Color saffron500 = Color(0xFFD97706);

  /// The lightest saffron that still carries near-white text at 4.5:1, which is
  /// why it — and not the brighter [saffron400] — is the light theme's primary.
  static const Color saffron600 = Color(0xFFB45309);
  static const Color saffron700 = Color(0xFF92400E);
  static const Color saffron800 = Color(0xFF7C3A06);
  static const Color saffron900 = Color(0xFF4A1F05);

  // ── Indigo: depth. Hero surfaces, the dark theme's canvas, ink. ────────────
  static const Color indigo50 = Color(0xFFF1F0F7);
  static const Color indigo100 = Color(0xFFDEDCEC);
  static const Color indigo200 = Color(0xFFB9B5D6);
  static const Color indigo300 = Color(0xFF8E88BC);
  static const Color indigo400 = Color(0xFFA29CB5);
  static const Color indigo500 = Color(0xFF443C7D);
  static const Color indigo600 = Color(0xFF322B60);
  static const Color indigo700 = Color(0xFF262045);
  static const Color indigo750 = Color(0xFF2E2B45);
  static const Color indigo800 = Color(0xFF24223A);
  static const Color indigo850 = Color(0xFF1C1A2B);
  static const Color indigo900 = Color(0xFF14131F);

  /// Body ink. Indigo-tinted rather than black: pure black on a warm background
  /// looks like a hole punched in the page.
  static const Color ink = Color(0xFF1B1A2E);

  // ── Sand: the warm neutral. Backgrounds, cards, borders, secondary text. ───
  static const Color sand50 = Color(0xFFFDFBF7);
  static const Color sand100 = Color(0xFFF7F2EA);
  static const Color sand200 = Color(0xFFEFE7DA);
  static const Color sand300 = Color(0xFFE2D7C5);
  static const Color sand400 = Color(0xFFBFB3A0);
  static const Color sand600 = Color(0xFF6B6255);
  static const Color sand700 = Color(0xFF4A4338);
  static const Color white = Color(0xFFFFFFFF);

  // ── Destructive. Kept red — this is the one place convention beats brand. ──
  static const Color red500 = Color(0xFFF87171);
  static const Color red700 = Color(0xFFB91C1C);
  static const Color red950 = Color(0xFF2A0606);

  static const Color onSaffron = Color(0xFFFFFBF5);
  static const Color onSaffronDark = Color(0xFF2A1B04);
  static const Color onRed = Color(0xFFFFF7F7);

  /// Deterministic gradient pairs for identity avatars.
  ///
  /// Curated, not generated: an algorithmic hue-from-hash produces mint green
  /// next to saffron sooner or later. Every pair is a brand-adjacent dark, so
  /// [onSaffron]-weight text clears 4.5:1 on the *lighter* stop of every one of
  /// them — the avatar can never render unreadable initials.
  static const List<(Color, Color)> avatarPairs = <(Color, Color)>[
    (saffron600, saffron700),
    (indigo500, indigo700),
    (saffron800, saffron900),
    (Color(0xFF2F5D50), Color(0xFF1C3B32)),
    (Color(0xFF8A3B4F), Color(0xFF5C2434)),
    (Color(0xFF3A5A8C), Color(0xFF22395C)),
  ];
}
