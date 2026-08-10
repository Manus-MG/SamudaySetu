import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/motion.dart';
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
      icon: LucideIcons.users,
      title: 'अपने समुदाय से जुड़ें',
      body: 'अपने समाज, संगठन या संस्था के सदस्यों की सूची एक ही जगह पर।',
    ),
    _Slide(
      icon: LucideIcons.network,
      title: 'अपना संगठन देखें',
      body: 'राष्ट्रीय स्तर से लेकर बूथ तक — पूरी संरचना स्पष्ट रूप से।',
    ),
    _Slide(
      icon: LucideIcons.shieldCheck,
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
  const _Slide({required this.icon, required this.title, required this.body});

  final IconData icon;
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

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.pagePadding),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          // The icon travels furthest and scales down as it leaves — the layer
          // the eye reads as "closest", so it should move most.
          Transform.translate(
            offset: Offset(offset * 90, 0),
            child: Transform.scale(
              scale: 1 - distance * 0.2,
              child: Opacity(
                opacity: opacity,
                child: _SlideIcon(icon: slide.icon),
              ),
            ),
          ),
          const SizedBox(height: 40),

          // Text trails the icon: less travel, so it reads as further away.
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
  }
}

class _SlideIcon extends StatelessWidget {
  const _SlideIcon({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      height: 132,
      width: 132,
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: 52, color: theme.colorScheme.foreground),
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
