import 'package:flutter/animation.dart';

/// One source of truth for how the app moves.
///
/// Durations and curves live here rather than scattered across widgets so the
/// whole app can be slowed down, sped up or flattened in one edit — and so
/// nothing ever animates for 350 ms in one screen and 280 ms in the next.
///
/// The scale is deliberately short. On a 2 GB phone every frame is contended;
/// an animation the user has to wait for is a bug, not polish.
abstract final class Motion {
  /// State flips that must feel instant: press, ripple, checkbox.
  static const Duration fast = Duration(milliseconds: 150);

  /// The default. Entrances, fades, most transitions.
  static const Duration normal = Duration(milliseconds: 280);

  /// Whole-page transitions, where a little more travel reads as intent.
  static const Duration slow = Duration(milliseconds: 420);

  /// Gap between items in a staggered list entrance. Anything above ~60 ms and
  /// the last item feels late rather than choreographed.
  static const Duration stagger = Duration(milliseconds: 55);

  /// Decelerating: things arriving on screen. The default for entrances.
  static const Curve enter = Curves.easeOutCubic;

  /// Accelerating: things leaving. Exits should get out of the way quickly.
  static const Curve exit = Curves.easeInCubic;

  /// Symmetric, for something moving between two on-screen positions.
  static const Curve move = Curves.easeInOutCubic;

  /// A restrained overshoot for elements that should feel physical — the OTP
  /// success tick, a page indicator snapping into place.
  static const Curve spring = Curves.easeOutBack;

  /// How far an entering element travels, as a fraction of its own height.
  /// Small on purpose: large travel reads as jank on a slow panel.
  static const double slideDistance = 0.06;
}
