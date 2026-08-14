import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/async_view.dart';
import '../application/community_providers.dart';
import '../domain/community.dart';
import '../domain/join_kit.dart';
import 'widgets/community_share_sheet.dart';

/// The leader's sharing surface: the QR, every channel, and the code.
///
/// The ordering inside [CommunityShareSheet] is the argument this screen makes —
/// channels first, code last. Left to themselves leaders reach for the code
/// because it is the thing they were given, and dictating a code down a phone
/// line to a 70-year-old is the worst of the available paths.
///
/// What this screen adds over the member's version is the QR at full size and
/// the ability to retire a leaked code. Both are the leader's job alone.
class ShareKitScreen extends ConsumerWidget {
  const ShareKitScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ShadTheme.of(context);
    final community = ref.watch(myCommunityProvider);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('सदस्य जोड़ें', style: TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: AsyncView<Community?>(
          value: community,
          onRetry: () => ref.invalidate(myCommunityProvider),
          builder: (data) => data == null
              ? const Center(child: Text('कोई समुदाय नहीं मिला'))
              : _Kit(communityId: data.id),
        ),
      ),
    );
  }
}

class _Kit extends ConsumerWidget {
  const _Kit({required this.communityId});

  final String communityId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kit = ref.watch(joinKitProvider(communityId));

    return AsyncView<JoinKit>(
      value: kit,
      onRetry: () => ref.invalidate(joinKitProvider(communityId)),
      loadingLabel: 'कोड लाया जा रहा है…',
      builder: (data) => ListView(
        padding: const EdgeInsets.all(AppTheme.pagePadding),
        children: <Widget>[
          CommunityShareSheet(
            payload: data.toSharePayload(),
            footer: _RotateBlock(communityId: data.communityId),
          ),
        ],
      ),
    );
  }
}

/// Retiring a code that has leaked.
///
/// Kept out of [CommunityShareSheet] rather than hidden behind a flag: it is not
/// a way of sharing, it is the opposite, and a member who saw the same component
/// with one button greyed out would reasonably wonder what they were missing.
class _RotateBlock extends ConsumerStatefulWidget {
  const _RotateBlock({required this.communityId});

  final String communityId;

  @override
  ConsumerState<_RotateBlock> createState() => _RotateBlockState();
}

class _RotateBlockState extends ConsumerState<_RotateBlock> {
  bool _isRotating = false;
  bool _isConfirming = false;
  String? _error;

  Future<void> _rotate() async {
    setState(() {
      _isRotating = true;
      _error = null;
    });

    try {
      await ref.read(communityApiProvider).rotateJoinCode(widget.communityId);
      if (!mounted) return;
      setState(() => _isConfirming = false);
      invalidateCommunityFrom(ref);
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      setState(() => _error = failure.debugDisplayMessage);
    } finally {
      if (mounted) setState(() => _isRotating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (_error != null) ...<Widget>[
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: theme.textTheme.p.copyWith(
              height: AppTheme.devanagariLineHeight,
              color: theme.colorScheme.destructive,
            ),
          ),
          const SizedBox(height: 12),
        ],

        if (_isConfirming) ...<Widget>[
          Text(
            'नया कोड बनने पर पुराना कोड तुरंत बंद हो जाएगा। '
            'पहले से जुड़े सदस्य बने रहेंगे।',
            textAlign: TextAlign.center,
            style: theme.textTheme.muted.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: <Widget>[
              Expanded(
                child: ShadButton.outline(
                  onPressed: _isRotating ? null : () => setState(() => _isConfirming = false),
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
                  onPressed: _isRotating ? null : () => unawaited(_rotate()),
                  child: Text(_isRotating ? 'बदल रहे हैं…' : 'हाँ, बदलें'),
                ),
              ),
            ],
          ),
        ] else
          ShadButton.ghost(
            onPressed: () => setState(() => _isConfirming = true),
            child: Text(
              'नया कोड बनाएँ',
              style: theme.textTheme.muted.copyWith(
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          ),
      ],
    );
  }
}
