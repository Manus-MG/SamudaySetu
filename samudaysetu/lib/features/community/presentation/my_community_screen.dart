import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/async_view.dart';
import '../../../core/widgets/entrance.dart';
import '../../../core/widgets/share_actions.dart';
import '../../auth/application/session_controller.dart';
import '../application/community_providers.dart';
import '../domain/community.dart';

/// A member's view of the community they belong to.
///
/// Deliberately small. A member is not an administrator, and the backend agrees:
/// the member directory sits behind `community:read`, which an ordinary member
/// does not hold. So this screen shows what they belong to, lets them pass the
/// code on to a neighbour, and lets them leave.
class MyCommunityScreen extends ConsumerWidget {
  const MyCommunityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('मेरा समुदाय', style: TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(myCommunityProvider),
          child: AsyncView<Community?>(
            value: ref.watch(myCommunityProvider),
            onRetry: () => ref.invalidate(myCommunityProvider),
            loadingLabel: 'जानकारी लाई जा रही है…',
            builder: (data) =>
                data == null ? const _NotJoined() : _CommunityView(community: data),
          ),
        ),
      ),
    );
  }
}

class _NotJoined extends StatelessWidget {
  const _NotJoined();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return ListView(
      padding: const EdgeInsets.all(AppTheme.pagePadding),
      children: <Widget>[
        const SizedBox(height: 40),
        Icon(
          Icons.groups_rounded,
          size: 56,
          color: theme.colorScheme.mutedForeground,
        ),
        const SizedBox(height: 20),
        Text(
          'आप अभी किसी समुदाय से नहीं जुड़े',
          textAlign: TextAlign.center,
          style: theme.textTheme.h4.copyWith(height: AppTheme.devanagariLineHeight),
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 56,
          child: ShadButton(
            onPressed: () => context.push(AppRoutes.joinCommunity),
            child: const Text('कोड डालकर जुड़ें', style: TextStyle(fontSize: 17)),
          ),
        ),
      ],
    );
  }
}

class _CommunityView extends ConsumerStatefulWidget {
  const _CommunityView({required this.community});

  final Community community;

  @override
  ConsumerState<_CommunityView> createState() => _CommunityViewState();
}

class _CommunityViewState extends ConsumerState<_CommunityView> {
  bool _isLeaving = false;
  bool _isConfirmingLeave = false;
  String? _error;

  Future<void> _leave() async {
    setState(() {
      _isLeaving = true;
      _error = null;
    });

    try {
      await ref.read(communityApiProvider).leave();
      if (!mounted) return;

      // The user's own record changed too — `communityId` is now null, and both
      // the router and the home screen's prompt key off it.
      await ref.read(sessionControllerProvider.notifier).refreshUser();
      if (!mounted) return;

      invalidateCommunityFrom(ref);
      context.go(AppRoutes.home);
    } on ApiFailure catch (failure) {
      if (!mounted) return;
      setState(() => _error = failure.displayMessage);
    } finally {
      if (mounted) setState(() => _isLeaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final community = widget.community;
    final place = community.placeLabel;

    return ListView(
      padding: const EdgeInsets.all(AppTheme.pagePadding),
      children: <Widget>[
        Entrance.staggered(
          index: 0,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: theme.colorScheme.muted,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: <Widget>[
                Container(
                  height: 64,
                  width: 64,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.groups_rounded,
                    size: 34,
                    color: theme.colorScheme.primaryForeground,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  community.name,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.h3.copyWith(
                    height: AppTheme.devanagariLineHeight,
                  ),
                ),
                if (place != null) ...<Widget>[
                  const SizedBox(height: 4),
                  Text(
                    place,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.p.copyWith(
                      height: AppTheme.devanagariLineHeight,
                      color: theme.colorScheme.mutedForeground,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Text(
                  '${community.memberCount} सदस्य · ${community.type.label}',
                  style: theme.textTheme.muted.copyWith(
                    height: AppTheme.devanagariLineHeight,
                  ),
                ),
                if (community.description != null &&
                    community.description!.trim().isNotEmpty) ...<Widget>[
                  const SizedBox(height: 16),
                  Text(
                    community.description!,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.p.copyWith(
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),

        const SizedBox(height: AppTheme.gutter),

        // Members pass the code on to neighbours far more than leaders do, so
        // it is here rather than hidden behind a leader-only screen.
        if (community.isAcceptingMembers)
          Entrance.staggered(
            index: 1,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.muted,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Text(
                    'किसी और को जोड़ना है?',
                    style: theme.textTheme.large.copyWith(
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'उन्हें यह कोड बताएँ — ${community.joinCodeHindi ?? community.joinCode}',
                    style: theme.textTheme.muted.copyWith(
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: AppTheme.minTapTarget,
                    child: ShadButton.outline(
                      onPressed: () => unawaited(
                        ShareActions.copy(
                          context,
                          community.joinCode,
                          label: 'कोड कॉपी हो गया',
                        ),
                      ),
                      child: const Text('कोड कॉपी करें', style: TextStyle(fontSize: 16)),
                    ),
                  ),
                ],
              ),
            ),
          ),

        if (_error != null) ...<Widget>[
          const SizedBox(height: 16),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: theme.textTheme.p.copyWith(
              height: AppTheme.devanagariLineHeight,
              color: theme.colorScheme.destructive,
            ),
          ),
        ],

        const SizedBox(height: 32),

        // Leaving is destructive and rare, so it sits at the bottom behind a
        // confirmation rather than as a button someone can hit by accident.
        if (_isConfirmingLeave) ...<Widget>[
          Text(
            'समुदाय छोड़ने पर आपको दोबारा कोड से जुड़ना होगा।',
            textAlign: TextAlign.center,
            style: theme.textTheme.muted.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              Expanded(
                child: ShadButton.outline(
                  onPressed:
                      _isLeaving ? null : () => setState(() => _isConfirmingLeave = false),
                  child: const Text('रहने दें'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: theme.colorScheme.destructive,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: _isLeaving ? null : () => unawaited(_leave()),
                  child: Text(_isLeaving ? 'छोड़ रहे हैं…' : 'हाँ, छोड़ें'),
                ),
              ),
            ],
          ),
        ] else
          ShadButton.ghost(
            onPressed: () => setState(() => _isConfirmingLeave = true),
            child: Text(
              'समुदाय छोड़ें',
              style: theme.textTheme.muted.copyWith(
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          ),
      ],
    );
  }
}
