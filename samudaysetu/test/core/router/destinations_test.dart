import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samudaysetu/core/router/destinations.dart';
import 'package:samudaysetu/core/router/routes.dart';
import 'package:samudaysetu/features/auth/domain/app_user.dart';

/// The sidebar is the one place in the app where "what can this user reach?"
/// is answered as data, so it is also the one place that can be checked
/// without a widget test. These cases are the ones that break silently in the
/// UI: a member offered a door the router will bounce them off, and a row
/// highlighted on the wrong screen.
void main() {
  AppUser user({
    UserRole role = UserRole.user,
    String? communityId,
  }) =>
      AppUser(
        id: 'u1',
        role: role,
        status: UserStatus.active,
        isProfileComplete: true,
        communityId: communityId,
      );

  List<String> routesFor(AppUser value) => <String>[
        for (final NavSection section in AppDestinations.forUser(value))
          for (final NavDestination destination in section.destinations)
            destination.route,
      ];

  group('AppDestinations.forUser', () {
    test('offers a member with no community the join flow, not the sub-pages',
        () {
      final List<String> routes = routesFor(user());

      expect(routes, contains(AppRoutes.joinCommunity));
      expect(routes, isNot(contains(AppRoutes.myCommunity)));
      // The router guards everything under /community on membership; listing it
      // here would advertise a door that only ever produces a redirect.
      expect(routes, isNot(contains(AppRoutes.communityEvents)));
    });

    test('offers a joined member their community and its events', () {
      final List<String> routes = routesFor(user(communityId: 'c1'));

      expect(routes, containsAll(<String>[
        AppRoutes.home,
        AppRoutes.myCommunity,
        AppRoutes.communityEvents,
        AppRoutes.profile,
      ]));
      expect(routes, isNot(contains(AppRoutes.joinCommunity)));
    });

    test('gives a leader the administrative set and no member landing', () {
      final List<String> routes = routesFor(
        user(role: UserRole.leader, communityId: 'c1'),
      );

      expect(routes, containsAll(<String>[
        AppRoutes.leader,
        AppRoutes.leaderMembers,
        AppRoutes.leaderInvites,
        AppRoutes.leaderShare,
      ]));
      expect(routes, isNot(contains(AppRoutes.home)));
    });

    test('offers the samaj परिचय to every role, joined or not', () {
      // The one section that is not gated on having a community record. A
      // member deciding whether to join has to be able to read who the samaj
      // is first, so dropping this from any role is a regression.
      for (final AppUser value in <AppUser>[
        user(),
        user(communityId: 'c1'),
        user(role: UserRole.leader, communityId: 'c1'),
      ]) {
        expect(routesFor(value), contains(AppRoutes.about));
      }
    });

    test('treats an admin without a community like any unjoined member', () {
      expect(routesFor(user(role: UserRole.admin)),
          contains(AppRoutes.joinCommunity));
    });

    test('exposes exactly one root destination per role', () {
      for (final AppUser value in <AppUser>[
        user(),
        user(communityId: 'c1'),
        user(role: UserRole.leader, communityId: 'c1'),
      ]) {
        final Iterable<NavDestination> roots = <NavDestination>[
          for (final NavSection section in AppDestinations.forUser(value))
            ...section.destinations,
        ].where((NavDestination destination) => destination.isRoot);

        expect(roots.length, 1);
      }
    });
  });

  group('AppDestinations.selected', () {
    final List<NavSection> sections =
        AppDestinations.forUser(user(communityId: 'c1'));

    test('matches the exact route', () {
      expect(
        AppDestinations.selected(sections, AppRoutes.home)?.route,
        AppRoutes.home,
      );
    });

    test('prefers the deepest match over its parent', () {
      // Both /community and /community/events contain this location; the row
      // the user is standing on is the deeper one.
      expect(
        AppDestinations.selected(sections, AppRoutes.communityEvents)?.route,
        AppRoutes.communityEvents,
      );
    });

    test('attributes a nested screen to its parent destination', () {
      expect(
        AppDestinations.selected(sections, '/community/feature/chat')?.route,
        AppRoutes.myCommunity,
      );
      expect(
        AppDestinations.selected(sections, '/community/events/evt-1')?.route,
        AppRoutes.communityEvents,
      );
    });

    test('highlights nothing on a screen outside the sidebar', () {
      expect(AppDestinations.selected(sections, '/leader/share'), isNull);
    });
  });

  group('NavDestination.contains', () {
    const NavDestination join = NavDestination(
      label: 'x',
      icon: Icons.circle,
      route: AppRoutes.joinCommunity,
    );

    test('does not claim a sibling that merely shares a prefix', () {
      // '/joined' starts with '/join'. Without the separator check the join
      // row would light up on an unrelated screen.
      expect(join.contains('/joined'), isFalse);
      expect(join.contains(AppRoutes.joinCommunity), isTrue);
      expect(join.contains(AppRoutes.joinConfirm), isTrue);
    });
  });
}
