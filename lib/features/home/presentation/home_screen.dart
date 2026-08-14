import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/media/app_images.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/app_illustration.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/entrance.dart';
import '../../auth/application/session_controller.dart';
import '../../auth/domain/app_user.dart';

/// Where a signed-in member lands.
///
/// Deliberately thin. The backend exposes auth and users and nothing else yet,
/// so this shows what is real — who you are, what role you hold — and says
/// plainly that the rest is not built. A home screen padded with fake counters
/// is a home screen nobody can trust later.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ShadTheme.of(context);
    final user = ref.watch(sessionControllerProvider).user;

    if (user == null) {
      // The router redirects on sign-out; this is the single frame in between.
      return const Scaffold(body: SizedBox.shrink());
    }

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTheme.pagePadding),
          children: <Widget>[
            Entrance.staggered(index: 0, child: _Header(user: user)),
            const SizedBox(height: 28),

            // Placed above everything else, deliberately. For a member who has
            // just signed up this is the only thing on the screen that matters,
            // and burying it under an account summary is how people conclude the
            // app "does not do anything".
            if (user.needsCommunity) ...<Widget>[
              Entrance.staggered(index: 1, child: const _JoinCommunityCard()),
              const SizedBox(height: AppTheme.gutter),
            ],

            // Once they belong somewhere, the community is the thing they came
            // back for — it goes above the account summary.
            if (!user.needsCommunity) ...<Widget>[
              Entrance.staggered(index: 1, child: const _CommunityBanner()),
              const SizedBox(height: AppTheme.gutter),
              Entrance.staggered(index: 2, child: const _NavRows()),
              const SizedBox(height: AppTheme.gutter),
            ],

            Entrance.staggered(index: 3, child: _AccountCard(user: user)),
            const SizedBox(height: AppTheme.gutter),
            Entrance.staggered(index: 4, child: const _ComingSoonCard()),
            const SizedBox(height: 28),
            Entrance.staggered(index: 5, child: const _SignOutButton()),
          ],
        ),
      ),
    );
  }
}

/// Where a member goes from here.
///
/// Two rows rather than a bottom navigation bar: there are exactly two
/// destinations, and a persistent bar for two items spends permanent screen
/// height on a cheap phone to save one tap.
class _NavRows extends StatelessWidget {
  const _NavRows();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.card,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        border: Border.all(color: theme.colorScheme.border),
      ),
      child: Column(
        children: <Widget>[
          const _NavRow(
            icon: LucideIcons.users,
            label: 'मेरा समुदाय',
            route: AppRoutes.myCommunity,
          ),
          Divider(height: 1, color: theme.colorScheme.border),
          const _NavRow(
            icon: LucideIcons.user,
            label: 'मेरा खाता',
            route: AppRoutes.profile,
          ),
        ],
      ),
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({required this.icon, required this.label, required this.route});

  final IconData icon;
  final String label;
  final String route;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return InkWell(
      onTap: () => context.push(route),
      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        child: Row(
          children: <Widget>[
            Container(
              height: 40,
              width: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: theme.colorScheme.accent,
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
              ),
              child: Icon(
                icon,
                size: 20,
                color: theme.colorScheme.accentForeground,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.large.copyWith(
                  height: AppTheme.devanagariLineHeight,
                ),
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: theme.colorScheme.mutedForeground,
            ),
          ],
        ),
      ),
    );
  }
}

/// The masthead a member sees when they already belong somewhere.
///
/// Carries no data — deliberately. The community name and member count are not
/// in the API yet, and a banner with an invented "142 सदस्य" under it is worse
/// than a banner with none: it is the first thing a member would notice was
/// wrong the day the real number appeared. When the endpoint lands, the caption
/// slot below is where it goes.
class _CommunityBanner extends StatelessWidget {
  const _CommunityBanner();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return AppHeroImage(
      image: AppImages.communityBanner,
      aspectRatio: 21 / 9,
      overlay: Text(
        'आपका समुदाय',
        style: theme.textTheme.h4.copyWith(
          height: AppTheme.devanagariLineHeight,
          color: AppPalette.white,
        ),
      ),
    );
  }
}

/// The call to action for a member who has not joined anything yet.
///
/// Written as an invitation rather than a warning: someone who just installed
/// the app has done nothing wrong, and a red "action required" banner reads as
/// an error to a user who is already unsure of themselves.
class _JoinCommunityCard extends StatelessWidget {
  const _JoinCommunityCard();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        gradient: AppSurfaces.brand,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppSurfaces.lift(theme.brightness),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          // Sits above the copy rather than behind it. A photograph behind
          // Devanagari body text needs a scrim heavy enough that the photo
          // stops being worth showing; giving it its own band keeps both
          // legible.
          SizedBox(
            height: 132,
            width: double.infinity,
            child: AppNetworkImage(
              image: AppImages.joinCommunity,
              fallbackTone: IllustrationTone.onBrand,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'अपने समुदाय से जुड़ें',
                  style: theme.textTheme.h4.copyWith(
                    height: AppTheme.devanagariLineHeight,
                    color: AppPalette.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'नेता से मिला कोड डालें, या उनके भेजे लिंक को दबाएँ।',
                  style: theme.textTheme.p.copyWith(
                    height: AppTheme.devanagariLineHeight,
                    color: AppPalette.white.withValues(alpha: 0.85),
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: AppTheme.minTapTarget,
                  child: ShadButton.secondary(
                    onPressed: () => context.push(AppRoutes.joinCommunity),
                    child: const Text(
                      'कोड डालें',
                      style: TextStyle(fontSize: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Row(
      children: <Widget>[
        // Seeded on the immutable id, not the display name: an avatar that
        // changes colour because someone corrected a spelling is an avatar
        // nobody learns to recognise.
        AppAvatar(initials: user.initials, seed: user.id),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('नमस्ते', style: theme.textTheme.muted.copyWith(fontSize: 14)),
              Text(
                user.displayName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.h4,
              ),
            ],
          ),
        ),
        ShadBadge.secondary(child: Text(user.role.label)),
      ],
    );
  }
}

class _AccountCard extends StatelessWidget {
  const _AccountCard({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return ShadCard(
      title: Text('आपका खाता', style: theme.textTheme.h4),
      child: Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Column(
          children: <Widget>[
            _Row(label: 'मोबाइल', value: user.phone ?? '—'),
            _Row(label: 'भूमिका', value: user.role.label),
            _Row(
              label: 'प्रोफ़ाइल',
              value: user.isProfileComplete ? 'पूर्ण' : 'अधूरी',
            ),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Text(label, style: theme.textTheme.muted.copyWith(fontSize: 14)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.small,
            ),
          ),
        ],
      ),
    );
  }
}

class _ComingSoonCard extends StatelessWidget {
  const _ComingSoonCard();

  static const List<(IconData, String)> _planned = <(IconData, String)>[
    (LucideIcons.users, 'सदस्य सूची'),
    (LucideIcons.network, 'मेरा संगठन'),
    (LucideIcons.user, 'प्रोफ़ाइल'),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return ShadCard(
      title: Text('जल्द आ रहा है', style: theme.textTheme.h4),
      description: const Text('ये सुविधाएँ अभी बन रही हैं।'),
      child: Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Column(
          children: <Widget>[
            for (final (icon, label) in _planned)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: <Widget>[
                    Icon(icon, size: 18, color: theme.colorScheme.mutedForeground),
                    const SizedBox(width: 12),
                    Text(label, style: theme.textTheme.small),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SignOutButton extends ConsumerStatefulWidget {
  const _SignOutButton();

  @override
  ConsumerState<_SignOutButton> createState() => _SignOutButtonState();
}

class _SignOutButtonState extends ConsumerState<_SignOutButton> {
  bool _isSigningOut = false;

  Future<void> _signOut() async {
    setState(() => _isSigningOut = true);
    await ref.read(sessionControllerProvider.notifier).signOut();
    // No navigation here: the router redirects on the session change, and the
    // widget is gone by the time this returns.
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: AppTheme.minTapTarget,
      child: ShadButton.outline(
        onPressed: _isSigningOut ? null : () => unawaited(_signOut()),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(LucideIcons.logOut, size: 18),
            const SizedBox(width: 8),
            Text(_isSigningOut ? 'साइन आउट हो रहा है…' : 'साइन आउट'),
          ],
        ),
      ),
    );
  }
}
