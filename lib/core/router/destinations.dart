import 'package:flutter/material.dart';

import '../../features/auth/domain/app_user.dart';
import 'routes.dart';

/// One entry in the app's sidebar.
///
/// The sidebar is described as data rather than built as a widget tree because
/// its contents depend on two things that change at runtime — the signed-in
/// role and whether the member belongs to a community — and a widget tree with
/// those conditions inlined is a tree nobody can read or test. Here the answer
/// to "what can this user reach?" is one pure function, and the drawer is a
/// dumb renderer of its result.
@immutable
class NavDestination {
  const NavDestination({
    required this.label,
    required this.icon,
    required this.route,
    this.isRoot = false,
  });

  /// Hindi, like every other string shown to a member.
  final String label;

  final IconData icon;

  /// A path from [AppRoutes]. Never a literal — a sidebar pointing at a string
  /// the router has since renamed is a dead end that compiles.
  final String route;

  /// True for the screen a role lands on after sign-in.
  ///
  /// Root destinations are navigated to with `go` (replacing the stack) and
  /// everything else with `push`, which is what keeps the system back button
  /// meaningful. See `AppDrawer`.
  final bool isRoot;

  /// Whether [location] is this destination, or a screen nested under it.
  ///
  /// The `/` is load-bearing: without it `/join` would claim `/joined`, and a
  /// prefix match on a sibling route highlights the wrong row.
  bool contains(String location) =>
      location == route || location.startsWith('$route/');
}

/// A titled group of destinations. The title is `null` for the first group,
/// which holds only the landing screen and needs no heading to explain itself.
@immutable
class NavSection {
  const NavSection({required this.destinations, this.title});

  final String? title;
  final List<NavDestination> destinations;
}

/// What each kind of signed-in user can reach from the sidebar.
///
/// Every list below is `const`, so opening the drawer allocates nothing — the
/// three shapes are built once at compile time and handed out by reference.
abstract final class AppDestinations {
  // ── Member ─────────────────────────────────────────────────────────────────

  static const NavDestination _home = NavDestination(
    label: 'होम',
    icon: Icons.home_rounded,
    route: AppRoutes.home,
    isRoot: true,
  );

  static const NavDestination _myCommunity = NavDestination(
    label: 'मेरा समुदाय',
    icon: Icons.groups_rounded,
    route: AppRoutes.myCommunity,
  );

  static const NavDestination _events = NavDestination(
    label: 'कार्यक्रम',
    icon: Icons.event_rounded,
    route: AppRoutes.communityEvents,
  );

  static const NavDestination _join = NavDestination(
    label: 'समुदाय से जुड़ें',
    icon: Icons.group_add_rounded,
    route: AppRoutes.joinCommunity,
  );

  // ── Leader ─────────────────────────────────────────────────────────────────

  static const NavDestination _dashboard = NavDestination(
    label: 'मुख्य पृष्ठ',
    icon: Icons.dashboard_rounded,
    route: AppRoutes.leader,
    isRoot: true,
  );

  static const NavDestination _members = NavDestination(
    label: 'सदस्य',
    icon: Icons.people_alt_rounded,
    route: AppRoutes.leaderMembers,
  );

  static const NavDestination _invites = NavDestination(
    label: 'निमंत्रण',
    icon: Icons.mail_rounded,
    route: AppRoutes.leaderInvites,
  );

  static const NavDestination _share = NavDestination(
    label: 'कोड और QR',
    icon: Icons.qr_code_2_rounded,
    route: AppRoutes.leaderShare,
  );

  static const NavDestination _edit = NavDestination(
    label: 'समुदाय की जानकारी',
    icon: Icons.edit_rounded,
    route: AppRoutes.leaderEdit,
  );

  // ── Shared ─────────────────────────────────────────────────────────────────

  static const NavDestination _profile = NavDestination(
    label: 'मेरा खाता',
    icon: Icons.person_rounded,
    route: AppRoutes.profile,
  );

  static const NavSection _account = NavSection(
    title: 'खाता',
    destinations: <NavDestination>[_profile],
  );

  static const List<NavSection> _memberJoined = <NavSection>[
    NavSection(destinations: <NavDestination>[_home]),
    NavSection(
      title: 'समुदाय',
      destinations: <NavDestination>[_myCommunity, _events],
    ),
    _account,
  ];

  static const List<NavSection> _memberUnjoined = <NavSection>[
    NavSection(destinations: <NavDestination>[_home]),
    NavSection(title: 'समुदाय', destinations: <NavDestination>[_join]),
    _account,
  ];

  static const List<NavSection> _leader = <NavSection>[
    NavSection(destinations: <NavDestination>[_dashboard]),
    NavSection(
      title: 'समुदाय',
      // Ordered by how often a leader actually taps them, which is the same
      // order the dashboard's own action list uses.
      destinations: <NavDestination>[_members, _invites, _share, _edit],
    ),
    _account,
  ];

  /// The sidebar for [user].
  ///
  /// Membership, not role, decides between the joined and unjoined member
  /// shapes: an admin signed in on the phone has no community either, and
  /// offering them `/community/events` would only produce a redirect. The
  /// router guards those paths regardless — this keeps the sidebar from
  /// advertising a door it knows is locked.
  static List<NavSection> forUser(AppUser user) {
    if (user.role == UserRole.leader) return _leader;
    return user.communityId == null ? _memberUnjoined : _memberJoined;
  }

  /// The destination [location] belongs to, or `null` if it belongs to none.
  ///
  /// Longest match wins, so standing on `/community/events` highlights
  /// कार्यक्रम rather than its parent मेरा समुदाय.
  static NavDestination? selected(List<NavSection> sections, String location) {
    NavDestination? best;
    for (final NavSection section in sections) {
      for (final NavDestination destination in section.destinations) {
        if (!destination.contains(location)) continue;
        if (best == null || destination.route.length > best.route.length) {
          best = destination;
        }
      }
    }
    return best;
  }
}
