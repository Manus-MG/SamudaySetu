import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/theme/app_theme.dart';
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
            Entrance.staggered(index: 1, child: _AccountCard(user: user)),
            const SizedBox(height: AppTheme.gutter),
            Entrance.staggered(index: 2, child: const _ComingSoonCard()),
            const SizedBox(height: 28),
            Entrance.staggered(index: 3, child: const _SignOutButton()),
          ],
        ),
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
        Container(
          height: 48,
          width: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: theme.colorScheme.muted,
            shape: BoxShape.circle,
          ),
          child: Text(user.initials, style: theme.textTheme.large),
        ),
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
