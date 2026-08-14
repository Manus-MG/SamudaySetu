import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../deeplink/deep_link_service.dart';
import '../../features/about/presentation/about_samaj_screen.dart';
import '../../features/about/presentation/samaj_values_screen.dart';
import '../../features/auth/application/session_controller.dart';
import '../../features/auth/domain/app_user.dart';
import '../../features/auth/presentation/otp_screen.dart';
import '../../features/auth/presentation/phone_screen.dart';
import '../../features/community/domain/community.dart';
import '../../features/community/presentation/confirm_community_screen.dart';
import '../../features/community/presentation/invite_screen.dart';
import '../../features/community/presentation/join_community_screen.dart';
import '../../features/community/presentation/community_form_screen.dart';
import '../../features/community/presentation/invites_screen.dart';
import '../../features/community/presentation/joined_community_screen.dart';
import '../../features/community/presentation/leader_dashboard_screen.dart';
import '../../features/community/presentation/members_screen.dart';
import '../../features/community/presentation/my_community_screen.dart';
import '../../features/community/presentation/scan_code_screen.dart';
import '../../features/community/presentation/share_kit_screen.dart';
import '../../features/community_features/data/sample_events.dart';
import '../../features/community_features/domain/community_feature.dart';
import '../../features/community_features/presentation/event_detail_screen.dart';
import '../../features/community_features/presentation/events_screen.dart';
import '../../features/community_features/presentation/feature_preview_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
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
/// Where a signed-in user belongs, by role.
///
/// Leaders get their own landing because their job is running a community, not
/// belonging to one; admins and super admins work in the web console and only
/// ever land here to check their own account.
String landingFor(UserRole? role) =>
    role == UserRole.leader ? AppRoutes.leader : AppRoutes.home;

/// A destination a signed-out user tapped, held until they have signed in.
///
/// Module-level rather than provider state because the redirect callback is
/// synchronous and runs outside any widget build — reading a provider there
/// would be a lie about when the value is available.
///
/// Deliberately a plain field with a *separate* wake signal rather than one
/// `ValueNotifier` doing both jobs. The router listens to [_deepLinkSignal] so a
/// link arriving while the app is idle re-runs the redirect; if the store itself
/// were that listenable, then parking or clearing a destination *from inside*
/// the redirect — which both branches below do — would notify go_router while it
/// is evaluating a redirect, and that surfaces as `setState() called during
/// build`. Splitting them means only [parkDeepLink], called from outside the
/// router, ever wakes it.
String? _pendingDeepLink;

final ValueNotifier<int> _deepLinkSignal = ValueNotifier<int>(0);

/// Parks [location] and asks the router to re-evaluate.
///
/// For links arriving from the OS. The redirect parks its own destinations
/// directly, without the signal, because it is already running.
void parkDeepLink(String location) {
  _pendingDeepLink = location;
  _deepLinkSignal.value++;
}

/// Binds the OS link stream to the router. Watched once, in `SamudaySetuApp`.
///
/// A provider rather than a `initState` in the root widget so that the
/// subscription's lifetime is the container's, not a widget's — the root widget
/// rebuilds on every theme change, and re-subscribing there would either leak a
/// stream per rebuild or need its own guard.
final deepLinkServiceProvider = Provider<DeepLinkService>((ref) {
  final service = DeepLinkService(
    // Warm start: the app is already on screen, so navigate. `go`, not `push` —
    // a link is a destination, and stacking join screens behind each other on
    // repeated taps gives the user a back button that walks through their own
    // history of tapping the same message.
    onLink: (location) => ref.read(routerProvider).go(location),
    // Cold start: park it. See `DeepLinkService` for why this cannot navigate.
    onColdStart: parkDeepLink,
  );

  ref.onDispose(() => unawaited(service.dispose()));
  unawaited(service.start());

  return service;
});

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.onDispose(refresh.dispose);

  // Only the fields that can change a redirect decision. Listening to the whole
  // state would re-evaluate routing every time an unrelated field moved.
  ref.listen<({
    SessionStatus status,
    bool onboardingSeen,
    UserRole? role,
    String? communityId,
  })>(
    sessionControllerProvider.select(
      (state) => (
        status: state.status,
        onboardingSeen: state.onboardingSeen,
        // A demotion or promotion changes which home screen is correct, so the
        // role belongs in this projection even though it rarely moves.
        role: state.user?.role,
        // Leaving a community has to eject anyone standing inside /community/*,
        // which only happens if a membership change re-runs the redirect.
        communityId: state.user?.communityId,
      ),
    ),
    (_, _) => refresh.value++,
  );

  return GoRouter(
    initialLocation: AppRoutes.splash,
    // Both signals, and the second is not redundant. A cold-start link is parked
    // after `getInitialLink()` resolves, which races the session restore: lose
    // that race and the redirect has already run, so without a listener here the
    // parked destination would sit unread until some unrelated session change
    // fired it at a baffling moment.
    refreshListenable: Listenable.merge(<Listenable?>[refresh, _deepLinkSignal]),
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
        // A deep link that arrived before sign-in was parked; now that there is
        // a session, honour it instead of dropping the user on the home screen.
        // Without this, tapping a WhatsApp invite while signed out means signing
        // in and then having to find the invite message again.
        final pending = _pendingDeepLink;
        if (pending != null) {
          _pendingDeepLink = null;
          return pending;
        }

        // Signed-in users have no business on the splash, in onboarding, or in
        // the auth flow — all three would let them sign in a second time.
        final isPreAuthScreen =
            inAuthFlow || location == AppRoutes.splash || location == AppRoutes.onboarding;
        if (isPreAuthScreen) return landingFor(session.user?.role);

        // A leader who somehow reaches the member home, or vice versa, is sent
        // to their own. Enforced here rather than by hiding buttons: a deep link
        // or a stale back-stack can reach either screen.
        if (location == AppRoutes.home && session.user?.role == UserRole.leader) {
          return AppRoutes.leader;
        }
        if (location.startsWith(AppRoutes.leader) && session.user?.role != UserRole.leader) {
          return AppRoutes.home;
        }

        // Everything *under* /community describes what belonging gets you, so
        // it means nothing to somebody who belongs to nothing. The community
        // screen itself is exempt: it has a proper "you have not joined" state
        // with the join button on it, which is exactly where such a user should
        // land. Guarded here rather than by hiding the tiles, because these
        // paths are deep links people forward to each other.
        final isCommunitySubPage =
            location.startsWith('${AppRoutes.myCommunity}/');
        if (isCommunitySubPage && session.user?.communityId == null) {
          return AppRoutes.myCommunity;
        }

        return null;
      }

      // Park a join or invite destination before bouncing to sign-in. Both are
      // links people tap from outside the app, so arriving signed-out is the
      // normal case, not the edge case.
      if (location.startsWith(AppRoutes.invite) ||
          location.startsWith(AppRoutes.joinCommunity)) {
        _pendingDeepLink = state.uri.toString();
        return AppRoutes.phone;
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

      // ── समाज परिचय ─────────────────────────────────────────────────────────
      GoRoute(
        path: AppRoutes.about,
        pageBuilder: (context, state) => fadeThroughPage<void>(
          key: state.pageKey,
          child: const AboutSamajScreen(),
        ),
        routes: <RouteBase>[
          GoRoute(
            // Nested, so the values screen keeps a back arrow to the परिचय.
            path: 'values',
            pageBuilder: (context, state) => slidePage<void>(
              key: state.pageKey,
              child: const SamajValuesScreen(),
            ),
          ),
        ],
      ),

      // ── Joining a community ────────────────────────────────────────────────
      GoRoute(
        path: AppRoutes.joinCommunity,
        pageBuilder: (context, state) => fadeThroughPage<void>(
          key: state.pageKey,
          child: const JoinCommunityScreen(),
        ),
        routes: <RouteBase>[
          GoRoute(
            // Before `:code`, and the order is the whole reason this is a
            // literal child rather than a sibling route: go_router matches in
            // declaration order, so `:code` declared first would capture `scan`
            // and send the user to look up a community called SCAN.
            path: 'scan',
            pageBuilder: (context, state) => slidePage<void>(
              key: state.pageKey,
              child: const ScanCodeScreen(),
            ),
          ),
          GoRoute(
            path: 'confirm',
            pageBuilder: (context, state) {
              final preview = state.extra;

              // Reached without a resolved preview — a deep link straight to
              // /join/confirm, or a hot reload. Send them to enter a code
              // rather than render a screen with nothing to confirm.
              if (preview is! CommunityPreview) {
                return fadeThroughPage<void>(
                  key: state.pageKey,
                  child: const JoinCommunityScreen(),
                );
              }

              return slidePage<void>(
                key: state.pageKey,
                child: ConfirmCommunityScreen(preview: preview),
              );
            },
          ),
          GoRoute(
            path: 'done',
            pageBuilder: (context, state) {
              final community = state.extra;

              if (community is! Community) {
                return fadeThroughPage<void>(
                  key: state.pageKey,
                  child: const HomeScreen(),
                );
              }

              return fadeThroughPage<void>(
                key: state.pageKey,
                child: JoinedCommunityScreen(community: community),
              );
            },
          ),
          GoRoute(
            // `/join/<code>` — a scanned QR or a tapped poster link. The code
            // is a path segment because it arrives from outside the app, where
            // there is no `extra` to carry it in. It is not PII, unlike the
            // phone number the auth flow deliberately keeps out of the path.
            path: ':code',
            pageBuilder: (context, state) => fadeThroughPage<void>(
              key: state.pageKey,
              child: JoinCommunityScreen(initialCode: state.pathParameters['code']),
            ),
          ),
        ],
      ),

      GoRoute(
        path: AppRoutes.profile,
        pageBuilder: (context, state) => fadeThroughPage<void>(
          key: state.pageKey,
          child: const ProfileScreen(),
        ),
      ),

      GoRoute(
        path: AppRoutes.myCommunity,
        pageBuilder: (context, state) => fadeThroughPage<void>(
          key: state.pageKey,
          child: const MyCommunityScreen(),
        ),
        routes: <RouteBase>[
          // Nested, so every one of these keeps a back arrow to the community
          // screen even when it was opened from a forwarded link.
          GoRoute(
            path: 'events',
            pageBuilder: (context, state) => slidePage<void>(
              key: state.pageKey,
              child: const EventsScreen(),
            ),
            routes: <RouteBase>[
              GoRoute(
                path: ':eventId',
                pageBuilder: (context, state) {
                  final event = SampleEvents.byId(state.pathParameters['eventId']);

                  // An unknown id — a stale link, or a sample that has since
                  // been removed. The list is the honest answer; a detail
                  // screen with empty fields is not.
                  if (event == null) {
                    return fadeThroughPage<void>(
                      key: state.pageKey,
                      child: const EventsScreen(),
                    );
                  }

                  return slidePage<void>(
                    key: state.pageKey,
                    child: EventDetailScreen(event: event),
                  );
                },
              ),
            ],
          ),
          GoRoute(
            path: 'feature/:slug',
            pageBuilder: (context, state) {
              final feature =
                  CommunityFeature.fromSlug(state.pathParameters['slug']);

              // A link to a feature this build does not know about. Older
              // clients will hit this every time a new feature is announced,
              // so it has to land somewhere sensible rather than crash.
              if (feature == null) {
                return fadeThroughPage<void>(
                  key: state.pageKey,
                  child: const MyCommunityScreen(),
                );
              }

              return slidePage<void>(
                key: state.pageKey,
                child: FeaturePreviewScreen(feature: feature),
              );
            },
          ),
        ],
      ),

      // Running a community ────────────────────────────────────────────────
      GoRoute(
        path: AppRoutes.leader,
        pageBuilder: (context, state) => fadeThroughPage<void>(
          key: state.pageKey,
          child: const LeaderDashboardScreen(),
        ),
        routes: <RouteBase>[
          GoRoute(
            path: 'create',
            pageBuilder: (context, state) => slidePage<void>(
              key: state.pageKey,
              child: const CommunityFormScreen(mode: CommunityFormMode.create),
            ),
          ),
          GoRoute(
            path: 'edit',
            pageBuilder: (context, state) => slidePage<void>(
              key: state.pageKey,
              child: const CommunityFormScreen(mode: CommunityFormMode.edit),
            ),
          ),
          GoRoute(
            path: 'share',
            pageBuilder: (context, state) => slidePage<void>(
              key: state.pageKey,
              child: const ShareKitScreen(),
            ),
          ),
          GoRoute(
            path: 'members',
            pageBuilder: (context, state) => slidePage<void>(
              key: state.pageKey,
              child: const MembersScreen(),
            ),
          ),
          GoRoute(
            path: 'invites',
            pageBuilder: (context, state) => slidePage<void>(
              key: state.pageKey,
              child: const InvitesScreen(),
            ),
          ),
        ],
      ),

      GoRoute(
        path: '${AppRoutes.invite}/:token',
        pageBuilder: (context, state) {
          final token = state.pathParameters['token'];

          if (token == null || token.isEmpty) {
            return fadeThroughPage<void>(
              key: state.pageKey,
              child: const JoinCommunityScreen(),
            );
          }

          return fadeThroughPage<void>(
            key: state.pageKey,
            child: InviteScreen(token: token),
          );
        },
      ),
    ],
  );
});
