import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/session_controller.dart';
import '../../features/auth/presentation/otp_screen.dart';
import '../../features/auth/presentation/phone_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/splash/presentation/splash_screen.dart';
import 'routes.dart';
import 'transitions.dart';

/// The router is built once and never rebuilt.
///
/// It reacts to session changes through `refreshListenable` rather than by being
/// recreated on every state change — recreating a `GoRouter` throws away the
/// navigation stack and remounts every screen, which is both a visible flicker
/// and a lost text field.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.onDispose(refresh.dispose);

  // Only the fields that can change a redirect decision. Listening to the whole
  // state would re-evaluate routing every time an unrelated field moved.
  ref.listen<({SessionStatus status, bool onboardingSeen})>(
    sessionControllerProvider.select(
      (state) => (status: state.status, onboardingSeen: state.onboardingSeen),
    ),
    (_, __) => refresh.value++,
  );

  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: refresh,
    debugLogDiagnostics: kDebugMode,
    redirect: (context, state) {
      final session = ref.read(sessionControllerProvider);
      final location = state.matchedLocation;

      // Hold on the splash until the stored session has been checked. Routing
      // before that would guess, and guessing wrong bounces the user.
      if (session.isRestoring) {
        return location == AppRoutes.splash ? null : AppRoutes.splash;
      }

      if (!session.onboardingSeen) {
        return location == AppRoutes.onboarding ? null : AppRoutes.onboarding;
      }

      final inAuthFlow = location == AppRoutes.phone || location == AppRoutes.otp;

      if (session.isSignedIn) {
        // Signed-in users have no business on the splash, in onboarding, or in
        // the auth flow — all three would let them sign in a second time.
        final isPreAuthScreen =
            inAuthFlow || location == AppRoutes.splash || location == AppRoutes.onboarding;
        return isPreAuthScreen ? AppRoutes.home : null;
      }

      return inAuthFlow ? null : AppRoutes.phone;
    },
    routes: <RouteBase>[
      GoRoute(
        path: AppRoutes.splash,
        pageBuilder: (context, state) => instantPage<void>(
          key: state.pageKey,
          child: const SplashScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.onboarding,
        pageBuilder: (context, state) => fadeThroughPage<void>(
          key: state.pageKey,
          child: const OnboardingScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.phone,
        pageBuilder: (context, state) => fadeThroughPage<void>(
          key: state.pageKey,
          child: const PhoneScreen(),
        ),
        routes: <RouteBase>[
          GoRoute(
            // Nested, so the OTP screen keeps a back arrow to the phone screen.
            path: 'otp',
            pageBuilder: (context, state) {
              final phone = state.extra as String?;

              // A deep link straight to /login/otp carries no phone number.
              // Sending the user back to enter one beats rendering a screen
              // that can never succeed.
              if (phone == null) {
                return fadeThroughPage<void>(
                  key: state.pageKey,
                  child: const PhoneScreen(),
                );
              }

              return slidePage<void>(
                key: state.pageKey,
                child: OtpScreen(phone: phone),
              );
            },
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.home,
        pageBuilder: (context, state) => fadeThroughPage<void>(
          key: state.pageKey,
          child: const HomeScreen(),
        ),
      ),
    ],
  );
});
