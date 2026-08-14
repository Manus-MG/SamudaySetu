import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samudaysetu/core/theme/app_palette.dart';
import 'package:samudaysetu/core/theme/app_theme.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

/// Contrast is a property of the palette, so it is tested like one.
///
/// This is not ceremony. The app is used outdoors on a cheap panel, where a
/// pair that measures 3.9:1 is not "slightly off spec" — it is text a member
/// standing in the sun cannot read. Checking it here means a future palette
/// tweak that looks fine on a laptop in a dark room fails in CI instead of in
/// someone's hand.
void main() {
  /// WCAG 2.1 relative luminance.
  double luminance(Color color) {
    double channel(double value) =>
        value <= 0.03928 ? value / 12.92 : math.pow((value + 0.055) / 1.055, 2.4).toDouble();

    return 0.2126 * channel(color.r) +
        0.7152 * channel(color.g) +
        0.0722 * channel(color.b);
  }

  /// WCAG 2.1 contrast ratio, 1..21.
  double contrast(Color a, Color b) {
    final double la = luminance(a);
    final double lb = luminance(b);
    return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
  }

  /// WCAG AA for body text. Everything below carries text at some point, so
  /// the large-text allowance of 3:1 is deliberately not used.
  const double aa = 4.5;

  void expectPairs(String label, ShadColorScheme scheme) {
    final Map<String, (Color, Color)> pairs = <String, (Color, Color)>{
      'foreground on background': (scheme.foreground, scheme.background),
      'cardForeground on card': (scheme.cardForeground, scheme.card),
      'popoverForeground on popover': (scheme.popoverForeground, scheme.popover),
      'primaryForeground on primary': (scheme.primaryForeground, scheme.primary),
      'secondaryForeground on secondary': (
        scheme.secondaryForeground,
        scheme.secondary,
      ),
      'mutedForeground on background': (
        scheme.mutedForeground,
        scheme.background,
      ),
      'mutedForeground on muted': (scheme.mutedForeground, scheme.muted),
      'accentForeground on accent': (scheme.accentForeground, scheme.accent),
      'destructiveForeground on destructive': (
        scheme.destructiveForeground,
        scheme.destructive,
      ),
      // Not a text pair, but a border invisible against its own background is
      // a card with no edge.
      'primary on background': (scheme.primary, scheme.background),
    };

    pairs.forEach((String name, (Color, Color) pair) {
      final double ratio = contrast(pair.$1, pair.$2);
      expect(
        ratio,
        greaterThanOrEqualTo(aa),
        reason: '$label — $name is ${ratio.toStringAsFixed(2)}:1, below $aa:1',
      );
    });
  }

  test('light scheme clears WCAG AA on every foreground pair', () {
    expectPairs('light', AppTheme.light.colorScheme);
  });

  test('dark scheme clears WCAG AA on every foreground pair', () {
    expectPairs('dark', AppTheme.dark.colorScheme);
  });

  test('avatar gradients carry their initials at AA on both stops', () {
    for (final (Color from, Color to) in AppPalette.avatarPairs) {
      for (final Color stop in <Color>[from, to]) {
        expect(
          contrast(AppPalette.onSaffron, stop),
          greaterThanOrEqualTo(aa),
          reason: 'avatar stop $stop cannot carry initials',
        );
      }
    }
  });
}
