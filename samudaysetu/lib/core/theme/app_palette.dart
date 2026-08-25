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
///  1. **Sunlight.** The target phone is used outdoors — in a timber yard, in a
///     mandi. Every foreground / background pair the theme derives from these
///     stops clears WCAG AA (4.5:1); most clear AAA. That is verified, not
///     assumed — see `test/core/theme/app_palette_contrast_test.dart`.
///  2. **The trade.** Teak is the heartwood brown a timber merchant sees all
///     day and can name on sight; forest is the green it is cut from. Sand is
///     the neutral — warm-tinted, never a pure grey, because pure grey next to
///     a wood brown reads as dust.
///
/// The stop *lightnesses* are inherited from the Arkvanshi build on `main`
/// rather than rechosen. Only the hues moved. That is what keeps the contrast
/// test passing across the re-brand instead of turning it into a week of
/// nudging hex values.
abstract final class AppPalette {
  // ── Teak: the brand hue. Actions, emphasis, brand marks. ───────────────────
  static const Color teak50 = Color(0xFFFBF5EF);
  static const Color teak100 = Color(0xFFF4E6D6);
  static const Color teak200 = Color(0xFFE8CBAC);
  static const Color teak300 = Color(0xFFD6A97C);
  static const Color teak400 = Color(0xFFC08A54);
  static const Color teak500 = Color(0xFFA9663A);

  /// The lightest teak that still carries near-white text at 4.5:1, which is
  /// why it — and not the brighter [teak400] — is the light theme's primary.
  static const Color teak600 = Color(0xFF8A4F2B);
  static const Color teak700 = Color(0xFF6E3D20);
  static const Color teak800 = Color(0xFF5A3019);
  static const Color teak900 = Color(0xFF351C0E);

  // ── Forest: depth. Hero surfaces, the dark theme's canvas, ink. ────────────
  static const Color forest50 = Color(0xFFEFF3EF);
  static const Color forest100 = Color(0xFFDAE4DA);
  static const Color forest200 = Color(0xFFB0C4B2);
  static const Color forest300 = Color(0xFF84A088);

  /// Lighter than [forest300] on purpose: this is the dark theme's muted
  /// foreground, and it has to clear AA on [forest900] and [forest800] both.
  static const Color forest400 = Color(0xFF9DAF9E);
  static const Color forest500 = Color(0xFF2E5138);
  static const Color forest600 = Color(0xFF22402A);
  static const Color forest700 = Color(0xFF1A3121);
  static const Color forest750 = Color(0xFF24352A);
  static const Color forest800 = Color(0xFF1E2A22);
  static const Color forest850 = Color(0xFF16211A);
  static const Color forest900 = Color(0xFF101812);

  /// Body ink. Brown-tinted rather than black: pure black on a warm background
  /// looks like a hole punched in the page.
  static const Color ink = Color(0xFF221C15);

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

  static const Color onTeak = Color(0xFFFFFBF5);
  static const Color onTeakDark = Color(0xFF2A1B0C);
  static const Color onRed = Color(0xFFFFF7F7);

  /// Deterministic gradient pairs for identity avatars.
  ///
  /// Curated, not generated: an algorithmic hue-from-hash produces mint green
  /// next to teak sooner or later. Every pair is a brand-adjacent dark, so
  /// [onTeak]-weight text clears 4.5:1 on the *lighter* stop of every one of
  /// them — the avatar can never render unreadable initials.
  static const List<(Color, Color)> avatarPairs = <(Color, Color)>[
    (teak600, teak700),
    (forest500, forest700),
    (teak800, teak900),
    (Color(0xFF2F5D50), Color(0xFF1C3B32)),
    (Color(0xFF8A3B4F), Color(0xFF5C2434)),
    (Color(0xFF3A5A8C), Color(0xFF22395C)),
  ];
}
