import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../features/auth/application/session_controller.dart';
import '../../features/auth/domain/app_user.dart';
import '../router/destinations.dart';
import '../theme/app_palette.dart';
import '../theme/app_theme.dart';
import 'app_avatar.dart';

/// The app's sidebar.
///
/// Why a drawer rather than a bottom bar: the destination list is not fixed.
/// A member with no community has three entries, a member with one has four,
/// a leader has six — and a bottom bar that changes width between roles reads
/// as a bug. A drawer also costs no permanent screen height, which on a 5"
/// phone rendering Devanagari at 1.45 line height is the scarcest resource on
/// the device.
///
/// It is attached to the screens people *return* to — home, the leader
/// dashboard, the community screen — and not to pushed detail screens, where a
/// hamburger would compete with the back arrow for the same corner. Deeper
/// screens are always one back tap from a screen that has it.
///
/// The contents come from [AppDestinations]; this widget renders them and owns
/// the navigation rule, nothing else.
class AppDrawer extends ConsumerWidget {
  const AppDrawer({super.key});

  /// Caps the drawer on a tablet and leaves a thumb-sized strip of the page
  /// visible on a phone, which is what tells a first-time user this is a panel
  /// over the screen rather than a new screen.
  static const double _maxWidth = 324;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ShadTheme.of(context);
    final AppUser? user =
        ref.watch(sessionControllerProvider.select((state) => state.user));

    // Signing out empties the session a frame before the router unmounts this.
    if (user == null) return const Drawer(child: SizedBox.shrink());

    final List<NavSection> sections = AppDestinations.forUser(user);
    final String location = GoRouterState.of(context).matchedLocation;
    final NavDestination? selected =
        AppDestinations.selected(sections, location);

    // True when the screen behind the drawer is itself a non-root sidebar
    // destination — i.e. the next tap is a hop between siblings. See
    // [_navigate].
    final bool isOnSibling = selected != null && !selected.isRoot;

    return Drawer(
      width: math.min(_maxWidth, MediaQuery.sizeOf(context).width * 0.86),
      backgroundColor: theme.colorScheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(
          right: Radius.circular(AppTheme.radiusXl),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          _Header(user: user),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 12),
              children: <Widget>[
                for (final NavSection section in sections)
                  ..._sectionWidgets(
                    drawerContext: context,
                    section: section,
                    selected: selected,
                    location: location,
                    isOnSibling: isOnSibling,
                  ),
              ],
            ),
          ),
          Divider(height: 1, color: theme.colorScheme.border),
          const _SignOutTile(),
          // Keeps the last tap target clear of the gesture bar.
          SizedBox(height: MediaQuery.paddingOf(context).bottom + 8),
        ],
      ),
    );
  }

  List<Widget> _sectionWidgets({
    required BuildContext drawerContext,
    required NavSection section,
    required NavDestination? selected,
    required String location,
    required bool isOnSibling,
  }) {
    final String? title = section.title;

    return <Widget>[
      if (title != null) _SectionTitle(title: title),
      for (final NavDestination destination in section.destinations)
        _DrawerTile(
          destination: destination,
          // Identity, not equality: [AppDestinations] hands out the same const
          // instances the selection was resolved from, so this cannot mistake
          // two entries that happen to share a label.
          isSelected: identical(destination, selected),
          onTap: () => _navigate(
            context: drawerContext,
            destination: destination,
            location: location,
            isOnSibling: isOnSibling,
          ),
        ),
      const SizedBox(height: 8),
    ];
  }

  /// Closes the drawer, then moves.
  ///
  /// Three cases, and the difference between them is what keeps the system back
  /// button honest:
  ///
  ///  - **Already there.** Close and do nothing. Re-navigating to the current
  ///    screen would rebuild it and throw away its scroll position for nothing.
  ///  - **A root destination.** `go`, which replaces the stack. The landing
  ///    screen is the bottom of the stack, so pushing it onto itself would make
  ///    "back" walk through a history of home screens.
  ///  - **Anything else.** `push` when coming from a landing screen, so back
  ///    returns there; `pushReplacement` when hopping between two sidebar
  ///    siblings, so browsing the sidebar does not pile up every screen the
  ///    user passed through on the way.
  void _navigate({
    required BuildContext context,
    required NavDestination destination,
    required String location,
    required bool isOnSibling,
  }) {
    Scaffold.of(context).closeDrawer();

    if (destination.contains(location)) return;

    if (destination.isRoot) {
      context.go(destination.route);
    } else if (isOnSibling) {
      context.pushReplacement(destination.route);
    } else {
      context.push(destination.route);
    }
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(26, 12, 26, 6),
      child: Text(
        title,
        style: theme.textTheme.muted.copyWith(
          fontSize: 12,
          height: AppTheme.devanagariLineHeight,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

/// The identity block at the top of the sidebar.
///
/// Carries the brand gradient because this is the one surface in the app that
/// is always a single gesture away, on every screen that has the drawer.
class _Header extends StatelessWidget {
  const _Header({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        20,
        MediaQuery.paddingOf(context).top + 24,
        20,
        22,
      ),
      decoration: const BoxDecoration(gradient: AppSurfaces.brand),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          AppAvatar(initials: user.initials, seed: user.id, size: 56),
          const SizedBox(height: 14),
          Text(
            user.displayName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.h4.copyWith(
              height: AppTheme.devanagariLineHeight,
              color: AppPalette.white,
            ),
          ),
          const SizedBox(height: 8),
          _Pill(label: user.role.label),
        ],
      ),
    );
  }
}

/// A role chip that reads on the brand gradient.
///
/// Not `ShadBadge`: every badge variant is themed against the *page*
/// background, and on a dark gradient the secondary one becomes a pale block
/// with pale text. A translucent white fill borrows whatever is behind it and
/// therefore cannot clash with either end of the gradient.
class _Pill extends StatelessWidget {
  const _Pill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppPalette.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.muted.copyWith(
          fontSize: 12,
          height: 1.2,
          fontWeight: FontWeight.w600,
          color: AppPalette.white,
        ),
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  const _DrawerTile({
    required this.destination,
    required this.isSelected,
    required this.onTap,
  });

  final NavDestination destination;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final BorderRadius radius = BorderRadius.circular(AppTheme.radiusMd);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Material(
        color: isSelected ? theme.colorScheme.accent : Colors.transparent,
        borderRadius: radius,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Semantics(
            button: true,
            selected: isSelected,
            child: Container(
              // A minimum rather than a fixed height: the label has to stay
              // free to wrap when the user turns their system font size up,
              // which this audience does.
              constraints: const BoxConstraints(
                minHeight: AppTheme.minTapTarget,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: Row(
                children: <Widget>[
                  Icon(
                    destination.icon,
                    size: 22,
                    color: isSelected
                        ? theme.colorScheme.primary
                        : theme.colorScheme.mutedForeground,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      destination.label,
                      style: theme.textTheme.p.copyWith(
                        height: AppTheme.devanagariLineHeight,
                        fontWeight:
                            isSelected ? FontWeight.w600 : FontWeight.w400,
                        color: isSelected
                            ? theme.colorScheme.accentForeground
                            : theme.colorScheme.foreground,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Sign-out, at the bottom of the sidebar rather than on the home screen.
///
/// The drawer stays open while the request runs instead of closing first:
/// revoking the refresh token is a network round trip, and on 2G that is
/// seconds during which a closed drawer would look like a tap that did nothing.
/// The router takes the whole page — drawer included — the moment the session
/// clears.
class _SignOutTile extends ConsumerStatefulWidget {
  const _SignOutTile();

  @override
  ConsumerState<_SignOutTile> createState() => _SignOutTileState();
}

class _SignOutTileState extends ConsumerState<_SignOutTile> {
  bool _isSigningOut = false;

  Future<void> _signOut() async {
    setState(() => _isSigningOut = true);
    await ref.read(sessionControllerProvider.notifier).signOut();
    // No navigation and no state reset here: the router redirects on the
    // session change, and this widget is gone by the time the future returns.
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final BorderRadius radius = BorderRadius.circular(AppTheme.radiusMd);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Material(
        color: Colors.transparent,
        borderRadius: radius,
        child: InkWell(
          onTap: _isSigningOut ? null : () => unawaited(_signOut()),
          borderRadius: radius,
          child: Container(
            constraints: const BoxConstraints(minHeight: AppTheme.minTapTarget),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Row(
              children: <Widget>[
                Icon(
                  Icons.logout_rounded,
                  size: 22,
                  color: theme.colorScheme.mutedForeground,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    _isSigningOut ? 'साइन आउट हो रहा है…' : 'साइन आउट',
                    style: theme.textTheme.p.copyWith(
                      height: AppTheme.devanagariLineHeight,
                      color: theme.colorScheme.mutedForeground,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
