import 'package:flutter/widgets.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/motion.dart';

/// The app's one entrance animation: fade up, slightly, once.
///
/// Having a single named entrance is the point. Screens that each hand-roll a
/// `fadeIn` end up with five different durations and four different curves, and
/// the app feels assembled rather than designed.
///
/// Cheap by construction: opacity and transform are compositor-only, so a
/// staggered list of these does not repaint anything.
class Entrance extends StatelessWidget {
  const Entrance({
    required this.child,
    this.delay = Duration.zero,
    this.duration = Motion.normal,
    super.key,
  });

  /// Builds the [index]th item of a staggered group. Later items start later,
  /// which reads as one motion arriving rather than several starting at once.
  factory Entrance.staggered({
    required int index,
    required Widget child,
    Duration base = Duration.zero,
    Key? key,
  }) =>
      Entrance(
        key: key,
        delay: base + Motion.stagger * index,
        child: child,
      );

  final Widget child;
  final Duration delay;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    return child
        .animate(delay: delay)
        .fadeIn(duration: duration, curve: Motion.enter)
        .slideY(
          begin: Motion.slideDistance,
          end: 0,
          duration: duration,
          curve: Motion.enter,
        );
  }
}
