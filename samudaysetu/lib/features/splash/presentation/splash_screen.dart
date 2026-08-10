import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/theme/motion.dart';

/// On screen only while the stored session is checked — usually a few hundred
/// milliseconds, sometimes one frame.
///
/// So it shows the mark and nothing else. A spinner that appears and vanishes
/// inside 200 ms reads as a glitch; a logo that fades in reads as the app
/// starting. The progress indicator only joins after a delay long enough that
/// the wait is real.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const _Mark(),
            const SizedBox(height: 20),
            Text('समुदाय सेतु', style: theme.textTheme.h3)
                .animate()
                .fadeIn(duration: Motion.slow, delay: 120.ms, curve: Motion.enter),
            const SizedBox(height: 32),
            SizedBox.square(
              dimension: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: theme.colorScheme.mutedForeground,
              ),
            ).animate().fadeIn(delay: 700.ms, duration: Motion.normal),
          ],
        ),
      ),
    );
  }
}

class _Mark extends StatelessWidget {
  const _Mark();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      height: 72,
      width: 72,
      decoration: BoxDecoration(
        color: theme.colorScheme.primary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Icon(
        LucideIcons.users,
        size: 34,
        color: theme.colorScheme.primaryForeground,
      ),
    )
        .animate()
        .fadeIn(duration: Motion.normal, curve: Motion.enter)
        .scaleXY(begin: 0.85, end: 1, duration: Motion.slow, curve: Motion.spring);
  }
}
