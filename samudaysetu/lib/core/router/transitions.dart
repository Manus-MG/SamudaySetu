import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../theme/motion.dart';

/// Route transitions, declared once.
///
/// go_router's default is the platform transition, which on Android is a
/// full-height slide — too much travel for a three-screen auth flow and
/// visibly janky on a low-end panel. These are shorter and cheaper: opacity
/// plus a few percent of translation, both of which the compositor handles
/// without repainting the subtree.

/// Forward motion within a flow: phone → OTP. Slides in from the trailing edge.
CustomTransitionPage<T> slidePage<T>({
  required Widget child,
  required LocalKey key,
}) =>
    CustomTransitionPage<T>(
      key: key,
      child: child,
      transitionDuration: Motion.normal,
      reverseTransitionDuration: Motion.fast,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final slide = Tween<Offset>(
          begin: const Offset(0.06, 0),
          end: Offset.zero,
        ).animate(CurvedAnimation(parent: animation, curve: Motion.enter));

        return FadeTransition(
          opacity: CurvedAnimation(parent: animation, curve: Motion.enter),
          child: SlideTransition(position: slide, child: child),
        );
      },
    );

/// A change of context rather than a step forward: splash → onboarding,
/// OTP → home. A cross-fade with a whisper of scale, so the new screen reads as
/// a different place without implying a stack the user can pop back to.
CustomTransitionPage<T> fadeThroughPage<T>({
  required Widget child,
  required LocalKey key,
}) =>
    CustomTransitionPage<T>(
      key: key,
      child: child,
      transitionDuration: Motion.slow,
      reverseTransitionDuration: Motion.normal,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(parent: animation, curve: Motion.enter);

        return FadeTransition(
          opacity: curved,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.98, end: 1).animate(curved),
            child: child,
          ),
        );
      },
    );

/// No transition. Used for the splash route, which is on screen for one frame
/// and would only flicker if animated.
NoTransitionPage<T> instantPage<T>({
  required Widget child,
  required LocalKey key,
}) =>
    NoTransitionPage<T>(key: key, child: child);
