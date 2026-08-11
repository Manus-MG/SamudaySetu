import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/async_view.dart';
import '../../../core/widgets/share_actions.dart';
import '../application/community_providers.dart';
import '../domain/community.dart';
import '../domain/join_kit.dart';

/// The leader's sharing surface, ordered by how little the *member* has to do.
///
///   1. WhatsApp the link — one tap for the member, on the app they already use.
///   2. Show the QR — for someone standing in front of you.
///   3. Read out the code — the fallback, which is why it is two Hindi words.
///
/// The order is the point. Left to themselves leaders reach for the code because
/// it is the thing they were given, and dictating a code down a phone line to a
/// 70-year-old is the worst of the three.
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
          const _Step(number: 1, title: 'WhatsApp पर भेजें'),
          const SizedBox(height: 10),
          _WhatsAppBlock(kit: data),
          const SizedBox(height: 28),

          const _Step(number: 2, title: 'QR दिखाएँ'),
          const SizedBox(height: 10),
          _QrBlock(kit: data),
          const SizedBox(height: 28),

          const _Step(number: 3, title: 'या कोड बताएँ'),
          const SizedBox(height: 10),
          _CodeBlock(kit: data),
        ],
      ),
    );
  }
}

// ── Pieces ───────────────────────────────────────────────────────────────────

class _Step extends StatelessWidget {
  const _Step({required this.number, required this.title});

  final int number;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Row(
      children: <Widget>[
        Container(
          height: 26,
          width: 26,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: theme.colorScheme.primary,
            shape: BoxShape.circle,
          ),
          child: Text(
            '$number',
            style: theme.textTheme.small.copyWith(
              color: theme.colorScheme.primaryForeground,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: theme.textTheme.h4.copyWith(height: AppTheme.devanagariLineHeight),
        ),
      ],
    );
  }
}

class _WhatsAppBlock extends StatelessWidget {
  const _WhatsAppBlock({required this.kit});

  final JoinKit kit;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        SizedBox(
          height: 56,
          // Material's `FilledButton` rather than `ShadButton`, purely so the
          // WhatsApp green survives: the shadcn button takes its colour from the
          // theme, and brand recognition is doing real work for a user who
          // cannot read the label.
          child: FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF25D366),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => unawaited(ShareActions.openOrCopy(context, kit.whatsAppUrl)),
            child: const Text('WhatsApp खोलें', style: TextStyle(fontSize: 17)),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: AppTheme.minTapTarget,
          child: ShadButton.outline(
            onPressed: () => unawaited(
              ShareActions.copy(context, kit.joinUrl, label: 'लिंक कॉपी हो गया'),
            ),
            child: const Text('लिंक कॉपी करें', style: TextStyle(fontSize: 16)),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'जिसे भेजेंगे वे बस लिंक दबाएँगे — कोई कोड डालने की ज़रूरत नहीं।',
          style: theme.textTheme.muted.copyWith(height: AppTheme.devanagariLineHeight),
        ),
      ],
    );
  }
}

class _QrBlock extends StatelessWidget {
  const _QrBlock({required this.kit});

  final JoinKit kit;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final bytes = kit.qrPngBytes;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: <Widget>[
          if (bytes != null)
            // White plate behind the code: on a dark theme the quiet zone would
            // otherwise sit against a dark background and stop scanning.
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Image.memory(
                bytes,
                width: 220,
                height: 220,
                // The source is one pixel per module scaled up; smoothing it
                // blurs the edges a scanner relies on.
                filterQuality: FilterQuality.none,
                gaplessPlayback: true,
              ),
            )
          else
            Text(
              'QR नहीं बन पाया — नीचे दिया कोड इस्तेमाल करें।',
              textAlign: TextAlign.center,
              style: theme.textTheme.muted.copyWith(
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          const SizedBox(height: 14),
          Text(
            'सामने वाले से कहें कि अपने फ़ोन के कैमरे से इसे स्कैन करें।',
            textAlign: TextAlign.center,
            style: theme.textTheme.muted.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
        ],
      ),
    );
  }
}

class _CodeBlock extends ConsumerStatefulWidget {
  const _CodeBlock({required this.kit});

  final JoinKit kit;

  @override
  ConsumerState<_CodeBlock> createState() => _CodeBlockState();
}

class _CodeBlockState extends ConsumerState<_CodeBlock> {
  bool _isRotating = false;
  bool _isConfirmingRotate = false;
  String? _error;

  Future<void> _rotate() async {
    setState(() {
      _isRotating = true;
      _error = null;
    });

    try {
      await ref.read(communityApiProvider).rotateJoinCode(widget.kit.communityId);
      if (!mounted) return;
      setState(() => _isConfirmingRotate = false);
      invalidateCommunityFrom(ref);
    } on ApiFailure catch (failure) {
      if (!mounted) return;
      setState(() => _error = failure.displayMessage);
    } finally {
      if (mounted) setState(() => _isRotating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final kit = widget.kit;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: <Widget>[
          // One chip per word. Someone reading this down a phone line needs to
          // see where one word ends and the next begins.
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              for (final word in kit.joinCodeWords)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.background,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: theme.colorScheme.border),
                  ),
                  child: Text(
                    word,
                    style: theme.textTheme.h4.copyWith(letterSpacing: 1.5),
                  ),
                ),
            ],
          ),

          if (kit.joinCodeHindi != null) ...<Widget>[
            const SizedBox(height: 12),
            Text(
              kit.joinCodeHindi!,
              style: theme.textTheme.h4.copyWith(
                height: AppTheme.devanagariLineHeight,
                color: theme.colorScheme.mutedForeground,
              ),
            ),
          ],

          const SizedBox(height: 16),
          SizedBox(
            height: AppTheme.minTapTarget,
            width: double.infinity,
            child: ShadButton.outline(
              onPressed: () => unawaited(
                ShareActions.copy(context, kit.joinCode, label: 'कोड कॉपी हो गया'),
              ),
              child: const Text('कोड कॉपी करें', style: TextStyle(fontSize: 16)),
            ),
          ),

          if (_error != null) ...<Widget>[
            const SizedBox(height: 12),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: theme.textTheme.p.copyWith(
                height: AppTheme.devanagariLineHeight,
                color: theme.colorScheme.destructive,
              ),
            ),
          ],

          const SizedBox(height: 8),
          if (_isConfirmingRotate) ...<Widget>[
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
                    onPressed: _isRotating
                        ? null
                        : () => setState(() => _isConfirmingRotate = false),
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
              onPressed: () => setState(() => _isConfirmingRotate = true),
              child: Text(
                'नया कोड बनाएँ',
                style: theme.textTheme.muted.copyWith(
                  height: AppTheme.devanagariLineHeight,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
