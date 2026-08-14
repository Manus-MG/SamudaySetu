import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/entrance.dart';
import '../../auth/application/session_controller.dart';
import '../domain/community.dart';

/// Where a tapped invite link lands.
///
/// This is the zero-typing path and the one most members will take: their leader
/// sends a link on WhatsApp, they tap it, they see their community's name, they
/// press one button. There is no code on this screen at all, by design.
///
/// The token still needs a signed-in account, so an unauthenticated tap goes
/// through the phone/OTP flow first — the router holds the pending token and
/// returns here afterwards.
class InviteScreen extends ConsumerStatefulWidget {
  const InviteScreen({super.key, required this.token});

  final String token;

  @override
  ConsumerState<InviteScreen> createState() => _InviteScreenState();
}

class _InviteScreenState extends ConsumerState<InviteScreen> {
  InvitePreview? _preview;
  bool _isLoading = true;
  bool _isAccepting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // `_load` owns its own error handling and never throws, so there is nothing
    // for `initState` to await or recover from.
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final preview = await ref.read(communityApiProvider).previewInvite(widget.token);
      if (!mounted) return;
      setState(() {
        _preview = preview;
        _isLoading = false;
      });
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      setState(() {
        _error = failure.debugDisplayMessage;
        _isLoading = false;
      });
    }
  }

  Future<void> _accept() async {
    if (_isAccepting) return;

    setState(() {
      _isAccepting = true;
      _error = null;
    });

    try {
      final community = await ref.read(communityApiProvider).acceptInvite(widget.token);
      if (!mounted) return;

      // `communityId` on the account has just changed; the router and the home
      // screen both read it, so refresh before navigating.
      await ref.read(sessionControllerProvider.notifier).refreshUser();
      if (!mounted) return;
      context.go(AppRoutes.joined, extra: community);
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      setState(() => _error = failure.debugDisplayMessage);
    } finally {
      if (mounted) setState(() => _isAccepting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.pagePadding),
          child: _body(theme),
        ),
      ),
    );
  }

  Widget _body(ShadThemeData theme) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(strokeWidth: 2.5));
    }

    final preview = _preview;

    // A dead link is a dead end, so the screen has to offer the other route in
    // rather than leaving the user with nothing to press.
    if (preview == null || !preview.isUsable) {
      final message = preview?.problem?.message ?? _error ?? 'यह लिंक काम नहीं कर रहा।';
      return _DeadEnd(message: message);
    }

    return Column(
      children: <Widget>[
        const Spacer(),

        Entrance.staggered(
          index: 0,
          child: Container(
            height: 72,
            width: 72,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: BorderRadius.circular(36),
            ),
            child: Icon(
              Icons.groups_rounded,
              size: 38,
              color: theme.colorScheme.primaryForeground,
            ),
          ),
        ),

        const SizedBox(height: 24),

        Entrance.staggered(
          index: 1,
          child: Text(
            'आपको आमंत्रित किया गया है',
            textAlign: TextAlign.center,
            style: theme.textTheme.p.copyWith(
              height: AppTheme.devanagariLineHeight,
              color: theme.colorScheme.mutedForeground,
            ),
          ),
        ),

        const SizedBox(height: 8),

        Entrance.staggered(
          index: 2,
          child: Text(
            preview.communityName,
            textAlign: TextAlign.center,
            style: theme.textTheme.h2.copyWith(height: AppTheme.devanagariLineHeight),
          ),
        ),

        if (preview.memberCount > 0) ...<Widget>[
          const SizedBox(height: 10),
          Entrance.staggered(
            index: 3,
            child: Text(
              '${preview.memberCount} लोग पहले से जुड़े हैं',
              textAlign: TextAlign.center,
              style: theme.textTheme.muted.copyWith(height: AppTheme.devanagariLineHeight),
            ),
          ),
        ],

        const Spacer(),

        if (_error != null) ...<Widget>[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.destructive.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              _error!,
              textAlign: TextAlign.center,
              style: theme.textTheme.p.copyWith(
                height: AppTheme.devanagariLineHeight,
                color: theme.colorScheme.destructive,
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],

        SizedBox(
          height: 56,
          width: double.infinity,
          child: ShadButton(
            onPressed: _isAccepting ? null : () => unawaited(_accept()),
            child: _isAccepting
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  )
                : const Text('जुड़ें', style: TextStyle(fontSize: 18)),
          ),
        ),

        const SizedBox(height: 16),
      ],
    );
  }
}

class _DeadEnd extends StatelessWidget {
  const _DeadEnd({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Column(
      children: <Widget>[
        const Spacer(),
        Icon(
          Icons.link_off_rounded,
          size: 56,
          color: theme.colorScheme.mutedForeground,
        ),
        const SizedBox(height: 20),
        Text(
          message,
          textAlign: TextAlign.center,
          style: theme.textTheme.p.copyWith(height: AppTheme.devanagariLineHeight),
        ),
        const Spacer(),
        SizedBox(
          height: 56,
          width: double.infinity,
          child: ShadButton(
            onPressed: () => context.go(AppRoutes.joinCommunity),
            child: const Text('कोड से जुड़ें', style: TextStyle(fontSize: 17)),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: AppTheme.minTapTarget,
          width: double.infinity,
          child: ShadButton.outline(
            onPressed: () => context.go(AppRoutes.home),
            child: const Text('बाद में', style: TextStyle(fontSize: 16)),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}
