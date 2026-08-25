import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/media/app_images.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/motion.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../auth/application/session_controller.dart';

/// Three slides, then Get Started. Shown once per install.
///
/// The motion here is doing a job, not decoration: the icon and text move at
/// different rates as the page scrolls (parallax), which makes a horizontal
/// swipe feel like moving through a space rather than replacing a rectangle.
/// All of it is opacity and transform — no repaints, so it holds 60fps on a
/// low-end panel.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _controller = PageController();

  /// Fractional page position, so the parallax is continuous while dragging
  /// rather than snapping between whole pages.
  double _page = 0;

  static const List<_Slide> _slides = <_Slide>[
    _Slide(
      image: AppImages.onboardingCommunity,
      title: 'अपने संघ से जुड़ें',
      body: 'क्षेत्र के काष्ठ व्यापारियों और सदस्य फर्मों की सूची एक ही जगह पर।',
    ),
    _Slide(
      image: AppImages.onboardingStructure,
      title: 'पूरा संगठन एक नज़र में',
      body: 'कार्यकारिणी से लेकर मंडी इकाई तक — संघ की पूरी संरचना स्पष्ट।',
    ),
    _Slide(
      image: AppImages.onboardingPrivacy,
      title: 'सुरक्षित और निजी',
      body: 'सिर्फ़ आपका मोबाइल नंबर चाहिए। कोई आधार नहीं, कोई पासवर्ड नहीं।',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onScroll);
  }

  void _onScroll() {
    // `page` is null until the first layout pass.
    final page = _controller.page;
    if (page != null && page != _page) setState(() => _page = page);
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  bool get _isLastSlide => _page >= _slides.length - 1 - 0.01;

  Future<void> _finish() async {
    await ref.read(sessionControllerProvider.notifier).completeOnboarding();
    if (!mounted) return;
    context.go(AppRoutes.phone);
  }

  void _next() {
    if (_isLastSlide) {
      unawaited(_finish());
      return;
    }
    _controller.nextPage(duration: Motion.slow, curve: Motion.move);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: SafeArea(
        child: Column(
          children: <Widget>[
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: AnimatedOpacity(
                  duration: Motion.normal,
                  opacity: _isLastSlide ? 0 : 1,
                  child: ShadButton.ghost(
                    onPressed: _isLastSlide ? null : () => unawaited(_finish()),
                    child: const Text('छोड़ें'),
                  ),
                ),
              ),
            ),

            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _slides.length,
                physics: const BouncingScrollPhysics(),
                itemBuilder: (context, index) => _SlideView(
                  slide: _slides[index],
                  // How far this page is from centre: 0 when settled, ±1 when
                  // fully off screen. Everything below is a function of it.
                  offset: index.toDouble() - _page,
                ),
              ),
            ),

            _PageDots(count: _slides.length, page: _page),
            const SizedBox(height: 24),

            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppTheme.pagePadding,
                0,
                AppTheme.pagePadding,
                AppTheme.pagePadding,
              ),
              child: SizedBox(
                width: double.infinity,
                height: AppTheme.minTapTarget,
                child: ShadButton(
                  onPressed: _next,
                  // Swapping the label rather than the button keeps the press
                  // target stable — the control never moves under the thumb.
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      AnimatedSwitcher(
                        duration: Motion.fast,
                        child: Text(
                          _isLastSlide ? 'शुरू करें' : 'आगे बढ़ें',
                          key: ValueKey<bool>(_isLastSlide),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(LucideIcons.arrowRight, size: 18),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Slide {
  const _Slide({required this.image, required this.title, required this.body});

  /// The photograph for this slide. Falls back to its own illustration when no
  /// image host is configured or the file has not landed yet, so onboarding is
  /// never three empty rectangles — see [AppNetworkImage].
  final AppImage image;

  final String title;
  final String body;
}

class _SlideView extends StatelessWidget {
  const _SlideView({required this.slide, required this.offset});

  final _Slide slide;

  /// Distance from centre in pages. Negative to the left, positive to the right.
  final double offset;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    // Clamped so a fast fling cannot push values past their useful range.
    final distance = offset.abs().clamp(0.0, 1.0);
    final opacity = 1 - distance;

    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        // Sized from the space actually available rather than a constant: on a
        // 4.5" 480x854 panel a fixed 260dp visual pushes the body text off the
        // bottom, and this slide is the first thing a new user ever sees.
        final double visualHeight =
            math.min(248, constraints.maxHeight * 0.46);

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.pagePadding),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              // The visual travels furthest and scales down as it leaves — the
              // layer the eye reads as "closest", so it should move most.
              Transform.translate(
                offset: Offset(offset * 90, 0),
                child: Transform.scale(
                  scale: 1 - distance * 0.2,
                  child: Opacity(
                    opacity: opacity,
                    child: _SlideVisual(
                      image: slide.image,
                      height: visualHeight,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 36),

              // Text trails the visual: less travel, so it reads as further away.
              Transform.translate(
                offset: Offset(offset * 45, 0),
                child: Opacity(
                  opacity: opacity,
                  child: Column(
                    children: <Widget>[
                      Text(
                        slide.title,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.h2.copyWith(
                          height: AppTheme.devanagariLineHeight,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        slide.body,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.muted.copyWith(
                          fontSize: 15,
                          height: AppTheme.devanagariLineHeight,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// The image card at the top of a slide.
///
/// A card with a warm gradient behind the photo rather than a bare `Image`:
/// while the photo is still arriving — or forever, on a build with no image
/// host — the illustration needs a surface to sit on, and a drawn motif
/// floating on the page background reads as a missing asset rather than as art.
class _SlideVisual extends StatelessWidget {
  const _SlideVisual({required this.image, required this.height});

  final AppImage image;
  final double height;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final Brightness brightness = theme.brightness;

    // `maxHeight`, not a tight `SizedBox`: a tight height forces `AspectRatio`
    // to derive width from it, and 248 * 4/3 = 330dp does not fit inside the
    // 312dp of content width a 360dp phone has. A maximum lets the ratio be
    // satisfied from whichever axis is scarcer, which is the width on a phone
    // and the height on a tablet.
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: height),
      child: AspectRatio(
        aspectRatio: 4 / 3,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: AppSurfaces.warm(brightness),
            borderRadius: BorderRadius.circular(AppTheme.radiusXl),
            border: Border.all(color: theme.colorScheme.border),
            boxShadow: AppSurfaces.lift(brightness),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppTheme.radiusXl),
            child: AppNetworkImage(image: image),
          ),
        ),
      ),
    );
  }
}

/// The active dot stretches into a pill and slides continuously with the drag,
/// so the indicator tracks the finger instead of snapping after it.
class _PageDots extends StatelessWidget {
  const _PageDots({required this.count, required this.page});

  final int count;
  final double page;

  static const double _dotSize = 8;
  static const double _activeWidth = 26;
  static const double _gap = 6;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List<Widget>.generate(count, (index) {
        // 1 when this dot is centred, 0 once a full page away.
        final proximity = math.max(0.0, 1 - (page - index).abs());

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: _gap / 2),
          height: _dotSize,
          width: _dotSize + (_activeWidth - _dotSize) * proximity,
          decoration: BoxDecoration(
            color: Color.lerp(
              theme.colorScheme.border,
              theme.colorScheme.primary,
              proximity,
            ),
            borderRadius: BorderRadius.circular(_dotSize),
          ),
        );
      }),
    );
  }
}
