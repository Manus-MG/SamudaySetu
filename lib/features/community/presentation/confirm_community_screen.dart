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

/// "Is this your community?"
///
/// The most important screen in the flow, and the reason the rest of it can
/// afford to be forgiving. Because a human confirms the match here, the server
/// is free to ignore hyphens, spaces and case when resolving a code — generosity
/// that would be dangerous without this step, since two codes can normalise to
/// the same string.
///
/// It is built around recognition rather than reading: the community's **name**
/// is the largest thing on screen, followed by its **place**, because "Barabanki"
/// is what an older member actually recognises. The code they typed is shown
/// small, as corroboration.
class ConfirmCommunityScreen extends ConsumerStatefulWidget {
  const ConfirmCommunityScreen({super.key, required this.preview});

  final CommunityPreview preview;

  @override
  ConsumerState<ConfirmCommunityScreen> createState() => _ConfirmCommunityScreenState();
}

class _ConfirmCommunityScreenState extends ConsumerState<ConfirmCommunityScreen> {
  bool _isJoining = false;
  String? _error;

  Future<void> _join() async {
    if (_isJoining) return;

    setState(() {
      _isJoining = true;
      _error = null;
    });

    try {
      final community = await ref
          .read(communityApiProvider)
          .joinByCode(widget.preview.joinCode);
      if (!mounted) return;

      // `communityId` on the account has just changed; the router and the home
      // screen both read it, so refresh before navigating.
      await ref.read(sessionControllerProvider.notifier).refreshUser();
      if (!mounted) return;

      // `go`, not `push`: the code screen behind us must not be reachable with
      // the back button once membership exists.
      context.go(AppRoutes.joined, extra: community);
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      setState(() => _error = failure.debugDisplayMessage);
    } finally {
      if (mounted) setState(() => _isJoining = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final preview = widget.preview;
    final blocked = preview.blockReason;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: AppTheme.pagePadding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const SizedBox(height: 8),
                    Entrance.staggered(
                      index: 0,
                      child: Text(
                        'क्या यह आपका समुदाय है?',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.h3
                            .copyWith(height: AppTheme.devanagariLineHeight),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Entrance.staggered(index: 1, child: _CommunityCard(preview: preview)),
                    const SizedBox(height: 16),

                    if (blocked != null)
                      Entrance.staggered(
                        index: 2,
                        child: _Notice(
                          message: blocked.message,
                          tone: _NoticeTone.warning,
                        ),
                      ),

                    if (_error != null)
                      Entrance.staggered(
                        index: 2,
                        child: _Notice(message: _error!, tone: _NoticeTone.error),
                      ),
                  ],
                ),
              ),
            ),

            // Pinned to the bottom rather than scrolled with the content: on a
            // small screen the choice must be reachable with a thumb without
            // scrolling past the community's details.
            Padding(
              padding: const EdgeInsets.all(AppTheme.pagePadding),
              child: Column(
                children: <Widget>[
                  SizedBox(
                    height: 56,
                    width: double.infinity,
                    child: ShadButton(
                      onPressed: preview.isAcceptingMembers && !_isJoining
                          ? () => unawaited(_join())
                          : null,
                      child: _isJoining
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2.5),
                            )
                          : const Text('हाँ, मुझे जोड़ें', style: TextStyle(fontSize: 17)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: AppTheme.minTapTarget,
                    width: double.infinity,
                    child: ShadButton.outline(
                      onPressed: _isJoining ? null : () => context.pop(),
                      child: const Text('नहीं, कोड बदलें', style: TextStyle(fontSize: 16)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/// The community, ordered by what a member will actually recognise.
class _CommunityCard extends StatelessWidget {
  const _CommunityCard({required this.preview});

  final CommunityPreview preview;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final place = preview.placeLabel;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.border),
      ),
      child: Column(
        children: <Widget>[
          Container(
            height: 64,
            width: 64,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: BorderRadius.circular(32),
            ),
            child: Icon(
              Icons.groups_rounded,
              size: 34,
              color: theme.colorScheme.primaryForeground,
            ),
          ),
          const SizedBox(height: 18),

          // Largest element on the screen. This is the thing being confirmed.
          Text(
            preview.name,
            textAlign: TextAlign.center,
            style: theme.textTheme.h2.copyWith(height: AppTheme.devanagariLineHeight),
          ),

          if (place != null) ...<Widget>[
            const SizedBox(height: 6),
            Text(
              place,
              textAlign: TextAlign.center,
              style: theme.textTheme.p.copyWith(
                fontSize: 17,
                height: AppTheme.devanagariLineHeight,
                color: theme.colorScheme.mutedForeground,
              ),
            ),
          ],

          const SizedBox(height: 14),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              _Chip(label: preview.type.label),
              if (preview.memberCount > 0)
                _Chip(label: '${preview.memberCount} सदस्य'),
            ],
          ),

          if (preview.description != null && preview.description!.trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: 16),
            Text(
              preview.description!,
              textAlign: TextAlign.center,
              style: theme.textTheme.muted.copyWith(
                fontSize: 14,
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          ],

          const SizedBox(height: 20),
          Divider(color: theme.colorScheme.border, height: 1),
          const SizedBox(height: 14),

          // Corroboration, not the headline. Shown in the canonical spelling so
          // someone who typed `surajkamal` sees the app understood them.
          Text(
            'कोड: ${preview.joinCodeHindi ?? preview.joinCode}',
            style: theme.textTheme.muted.copyWith(letterSpacing: 1),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.background,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.border),
      ),
      child: Text(
        label,
        style: theme.textTheme.small.copyWith(height: AppTheme.devanagariLineHeight),
      ),
    );
  }
}

enum _NoticeTone { warning, error }

class _Notice extends StatelessWidget {
  const _Notice({required this.message, required this.tone});

  final String message;
  final _NoticeTone tone;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final color = tone == _NoticeTone.error
        ? theme.colorScheme.destructive
        : const Color(0xFFB45309);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(
            tone == _NoticeTone.error ? Icons.error_outline : Icons.info_outline,
            size: 20,
            color: color,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.p.copyWith(
                height: AppTheme.devanagariLineHeight,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
