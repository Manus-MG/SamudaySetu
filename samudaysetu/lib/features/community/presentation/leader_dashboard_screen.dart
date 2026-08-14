import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/async_view.dart';
import '../../../core/widgets/entrance.dart';
import '../../auth/application/session_controller.dart';
import '../application/community_providers.dart';
import '../domain/community.dart';

/// Where a leader lands.
///
/// A leader has no account on the web console — they sign in here by phone and
/// OTP like any member — so this screen is the whole of their administrative
/// surface. It carries every operation the console offers for a single
/// community: share, code, members, invites, details and the recruitment switch.
///
/// Ordered by frequency rather than by importance. A leader opens this app to
/// share the code or to see who joined, not to edit the description, so sharing
/// is a full-width primary action and settings is a row in a list.
class LeaderDashboardScreen extends ConsumerWidget {
  const LeaderDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ShadTheme.of(context);
    final user = ref.watch(sessionControllerProvider).user;
    final community = ref.watch(myCommunityProvider);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      // A landing screen, so it carries the sidebar. The leader's own
      // destinations — members, invites, code, details — are otherwise only
      // reachable by scrolling past the community header to the action list.
      drawer: const AppDrawer(),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(myCommunityProvider),
          child: ListView(
            padding: const EdgeInsets.all(AppTheme.pagePadding),
            children: <Widget>[
              Entrance.staggered(
                index: 0,
                child: Row(
                  children: <Widget>[
                    const _MenuButton(),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            'नमस्ते',
                            style: theme.textTheme.muted.copyWith(fontSize: 14),
                          ),
                          Text(
                            user?.displayName ?? 'नेता',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.h4.copyWith(
                              height: AppTheme.devanagariLineHeight,
                            ),
                          ),
                        ],
                      ),
                    ),
                    ShadBadge.secondary(child: const Text('नेता')),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              AsyncView<Community?>(
                value: community,
                onRetry: () => ref.invalidate(myCommunityProvider),
                loadingLabel: 'आपका समुदाय लाया जा रहा है…',
                builder: (data) =>
                    data == null ? const _NoCommunityYet() : _Dashboard(community: data),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Opens the sidebar.
///
/// Its own widget so that `Scaffold.of` is called from a context *below* the
/// `Scaffold` — calling it from the screen's own build method finds no scaffold
/// and throws. This screen has no `AppBar`, so there is no automatic hamburger
/// to inherit.
class _MenuButton extends StatelessWidget {
  const _MenuButton();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return IconButton(
      onPressed: Scaffold.of(context).openDrawer,
      tooltip: 'मेनू',
      icon: Icon(
        Icons.menu_rounded,
        size: 26,
        color: theme.colorScheme.foreground,
      ),
      style: IconButton.styleFrom(
        backgroundColor: theme.colorScheme.muted,
        minimumSize: const Size(AppTheme.minTapTarget, AppTheme.minTapTarget),
        padding: EdgeInsets.zero,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppTheme.radiusSm)),
        ),
      ),
    );
  }
}

/// A leader who has not proposed a community yet.
///
/// This is a normal first-run state, not an error, so it reads as an invitation.
class _NoCommunityYet extends StatelessWidget {
  const _NoCommunityYet();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: theme.colorScheme.muted,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: <Widget>[
              Icon(
                Icons.groups_rounded,
                size: 48,
                color: theme.colorScheme.mutedForeground,
              ),
              const SizedBox(height: 16),
              Text(
                'अभी आपका कोई समुदाय नहीं है',
                textAlign: TextAlign.center,
                style: theme.textTheme.h4.copyWith(
                  height: AppTheme.devanagariLineHeight,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'अपना समुदाय बनाएँ। मंज़ूरी मिलने के बाद आप सदस्यों को जोड़ पाएँगे।',
                textAlign: TextAlign.center,
                style: theme.textTheme.muted.copyWith(
                  height: AppTheme.devanagariLineHeight,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 56,
          child: ShadButton(
            onPressed: () => context.push(AppRoutes.leaderCreate),
            child: const Text('समुदाय बनाएँ', style: TextStyle(fontSize: 17)),
          ),
        ),
      ],
    );
  }
}

class _Dashboard extends StatelessWidget {
  const _Dashboard({required this.community});

  final Community community;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final canShare = community.status == CommunityStatus.active;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Entrance.staggered(index: 1, child: _CommunityHeader(community: community)),
        const SizedBox(height: AppTheme.gutter),

        // The status sentence is shown whenever it is not the boring one. A
        // leader whose community is awaiting approval will otherwise conclude
        // the share button is broken.
        if (community.status != CommunityStatus.active)
          Entrance.staggered(
            index: 2,
            child: Padding(
              padding: const EdgeInsets.only(bottom: AppTheme.gutter),
              child: _StatusNote(community: community),
            ),
          ),

        if (canShare) ...<Widget>[
          Entrance.staggered(
            index: 3,
            child: SizedBox(
              height: 56,
              child: ShadButton(
                onPressed: () => context.push(AppRoutes.leaderShare),
                child: const Text('सदस्य जोड़ें / कोड साझा करें',
                    style: TextStyle(fontSize: 17)),
              ),
            ),
          ),
          const SizedBox(height: AppTheme.gutter),
        ],

        Entrance.staggered(
          index: 4,
          child: _ActionList(community: community, canShare: canShare),
        ),

        const SizedBox(height: 24),
        Entrance.staggered(
          index: 5,
          child: Text(
            'कोड: ${community.joinCodeHindi ?? community.joinCode}',
            textAlign: TextAlign.center,
            style: theme.textTheme.muted.copyWith(letterSpacing: 1),
          ),
        ),
      ],
    );
  }
}

class _CommunityHeader extends StatelessWidget {
  const _CommunityHeader({required this.community});

  final Community community;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final place = community.placeLabel;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            community.name,
            style: theme.textTheme.h3.copyWith(
              height: AppTheme.devanagariLineHeight,
              color: theme.colorScheme.primaryForeground,
            ),
          ),
          if (place != null) ...<Widget>[
            const SizedBox(height: 4),
            Text(
              place,
              style: theme.textTheme.p.copyWith(
                height: AppTheme.devanagariLineHeight,
                color: theme.colorScheme.primaryForeground.withValues(alpha: 0.8),
              ),
            ),
          ],
          const SizedBox(height: 18),
          Row(
            children: <Widget>[
              _Stat(
                value: '${community.memberCount}',
                label: 'सदस्य',
                color: theme.colorScheme.primaryForeground,
              ),
              const SizedBox(width: 28),
              _Stat(
                value: community.status.label,
                label: 'स्थिति',
                color: theme.colorScheme.primaryForeground,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label, required this.color});

  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          value,
          style: theme.textTheme.h4.copyWith(
            height: AppTheme.devanagariLineHeight,
            color: color,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.muted.copyWith(color: color.withValues(alpha: 0.75)),
        ),
      ],
    );
  }
}

class _StatusNote extends StatelessWidget {
  const _StatusNote({required this.community});

  final Community community;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final isBad = community.status == CommunityStatus.rejected ||
        community.status == CommunityStatus.archived;
    final color = isBad ? theme.colorScheme.destructive : const Color(0xFFB45309);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(isBad ? Icons.error_outline : Icons.hourglass_top_rounded,
              size: 20, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  community.status.explanation,
                  style: theme.textTheme.p.copyWith(
                    height: AppTheme.devanagariLineHeight,
                    color: color,
                  ),
                ),
                if (community.rejectionReason != null) ...<Widget>[
                  const SizedBox(height: 6),
                  Text(
                    community.rejectionReason!,
                    style: theme.textTheme.muted.copyWith(
                      height: AppTheme.devanagariLineHeight,
                      color: color,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionList extends StatelessWidget {
  const _ActionList({required this.community, required this.canShare});

  final Community community;
  final bool canShare;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    final rows = <_ActionRow>[
      _ActionRow(
        icon: Icons.people_outline_rounded,
        title: 'सदस्य',
        subtitle: '${community.memberCount} लोग जुड़े हैं',
        route: AppRoutes.leaderMembers,
      ),
      if (canShare)
        const _ActionRow(
          icon: Icons.mail_outline_rounded,
          title: 'निमंत्रण',
          subtitle: 'फ़ोन नंबर पर सीधे बुलाएँ',
          route: AppRoutes.leaderInvites,
        ),
      if (canShare)
        const _ActionRow(
          icon: Icons.qr_code_2_rounded,
          title: 'कोड और QR',
          subtitle: 'कोड बदलें या साझा करें',
          route: AppRoutes.leaderShare,
        ),
      _ActionRow(
        icon: Icons.edit_outlined,
        title: 'समुदाय की जानकारी',
        subtitle: 'नाम, जगह और विवरण',
        route: AppRoutes.leaderEdit,
        enabled: community.status.isEditable,
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: <Widget>[
          for (var i = 0; i < rows.length; i++) ...<Widget>[
            if (i > 0) Divider(height: 1, color: theme.colorScheme.border),
            rows[i],
          ],
        ],
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.route,
    this.enabled = true,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String route;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return InkWell(
      onTap: enabled ? () => context.push(route) : null,
      borderRadius: BorderRadius.circular(14),
      child: Opacity(
        opacity: enabled ? 1 : 0.45,
        child: Padding(
          // Comfortably past the 52dp minimum: this list is the leader's main
          // navigation and gets tapped with a thumb, outdoors.
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(
            children: <Widget>[
              Icon(icon, size: 24, color: theme.colorScheme.foreground),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      title,
                      style: theme.textTheme.large.copyWith(
                        height: AppTheme.devanagariLineHeight,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: theme.textTheme.muted.copyWith(
                        height: AppTheme.devanagariLineHeight,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: theme.colorScheme.mutedForeground,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
