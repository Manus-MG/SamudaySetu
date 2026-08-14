import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/config/app_brand.dart';
import '../../../core/media/app_images.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/motion.dart';
import '../../../core/widgets/app_illustration.dart';
import '../../../core/widgets/app_network_image.dart';

/// On screen only while the stored session is checked — usually a few hundred
/// milliseconds, sometimes one frame.
///
/// So it shows the mark and nothing else. A spinner that appears and vanishes
/// inside 200 ms reads as a glitch; a logo that fades in reads as the app
/// starting. The progress indicator only joins after a delay long enough that
/// the wait is real.
///
/// **About the photograph.** It is layered *over* the brand gradient, not
/// instead of it, and it is the one image in the app allowed to not show up.
/// A splash cannot wait on a network request — on a first launch over 2G the
/// screen would be blank for the entire time the app is deciding where to send
/// you. So the gradient paints in frame one and is a complete design on its
/// own; the photograph fades in on top whenever it arrives, which in practice
/// means from the second launch onwards, off the disk cache. Neither state
/// looks like the other one failed.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          // Frame one, always.
          const DecoratedBox(
            decoration: BoxDecoration(gradient: AppSurfaces.brand),
          ),

          // Whenever it arrives. `.overlay` so a miss leaves the gradient
          // untouched rather than stacking an illustration on top of it.
          const AppNetworkImage.overlay(image: AppImages.splash),

          // The veil. Fixed opacities rather than a theme colour: this surface
          // is the brand, and the brand does not change with the system theme.
          // Without it, white text over an unknown photograph is a gamble.
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                // Tuned against the actual photograph, not guessed. At the
                // opacities a "safe" scrim suggests (0.86/0.78/0.88) the image
                // goes to brown mud and the screen looks like a loading
                // failure. These are the lightest values that still hold the
                // wordmark at AA over the brightest part of the photo.
                colors: <Color>[
                  AppPalette.indigo900.withValues(alpha: 0.62),
                  AppPalette.indigo700.withValues(alpha: 0.48),
                  AppPalette.saffron900.withValues(alpha: 0.74),
                ],
              ),
            ),
          ),

          SafeArea(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  const _Mark(),
                  const SizedBox(height: 22),
                  Text(
                    AppBrand.wordmark,
                    textAlign: TextAlign.center,
                    style: ShadTheme.of(context).textTheme.h3.copyWith(
                          height: AppTheme.devanagariLineHeight,
                          color: AppPalette.white,
                        ),
                  )
                      .animate()
                      .fadeIn(
                        duration: Motion.slow,
                        delay: 120.ms,
                        curve: Motion.enter,
                      ),
                  const SizedBox(height: 6),
                  // The lineage's own phrase, quieter than the wordmark. It is
                  // the one line that tells an Arkvanshi member, in the first
                  // second of the first launch, that this app was built for
                  // them and not adapted to them.
                  Text(
                    AppBrand.motto,
                    textAlign: TextAlign.center,
                    style: ShadTheme.of(context).textTheme.p.copyWith(
                          fontSize: 14,
                          height: AppTheme.devanagariLineHeight,
                          color: AppPalette.white.withValues(alpha: 0.82),
                        ),
                  ).animate().fadeIn(
                        duration: Motion.slow,
                        delay: 320.ms,
                        curve: Motion.enter,
                      ),
                  const SizedBox(height: 32),
                  SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppPalette.white.withValues(alpha: 0.7),
                    ),
                  ).animate().fadeIn(delay: 700.ms, duration: Motion.normal),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Mark extends StatelessWidget {
  const _Mark();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 104,
      width: 104,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppPalette.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        border: Border.all(color: AppPalette.white.withValues(alpha: 0.28)),
      ),
      // The community motif rather than a Lucide glyph: this is the one moment
      // the app has the screen to itself, and an icon from a library that every
      // other app also ships is a wasted first impression.
      child: const AppIllustration(
        motif: IllustrationMotif.community,
        tone: IllustrationTone.onBrand,
      ),
    )
        .animate()
        .fadeIn(duration: Motion.normal, curve: Motion.enter)
        .scaleXY(begin: 0.85, end: 1, duration: Motion.slow, curve: Motion.spring);
  }
}
