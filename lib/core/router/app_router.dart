import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/directory/presentation/screens/directory_screen.dart';
import '../../features/hierarchy/presentation/screens/hierarchy_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import 'routes.dart';

/// One entry point for login and signup: enter phone -> OTP -> onboarding if new,
/// home if known. Users are never asked to choose between "Login" and "Sign up".
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: AppRoutes.directory,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final goingToAuth = state.matchedLocation.startsWith(AppRoutes.login);

      if (!isAuthenticated && !goingToAuth) return AppRoutes.login;
      if (isAuthenticated && goingToAuth) return AppRoutes.directory;
      return null;
    },
    routes: <RouteBase>[
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.directory,
        builder: (context, state) => const DirectoryScreen(),
      ),
      GoRoute(
        path: AppRoutes.hierarchy,
        builder: (context, state) => const HierarchyScreen(),
      ),
      GoRoute(
        path: AppRoutes.profile,
        builder: (context, state) => const ProfileScreen(),
      ),
    ],
  );
});
