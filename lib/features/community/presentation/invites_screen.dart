import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/async_view.dart';
import '../../../core/share/share_actions.dart';
import '../application/community_providers.dart';
import '../domain/community.dart';
import '../domain/invite.dart';

/// Inviting one person by phone number.
///
/// The shortest path into a community for the audience that exists: nothing to
/// hear correctly, nothing to type, no camera to aim. The leader enters a number
/// they already have and the member taps a link.
///
/// SMS is not connected yet — see `core/sms` on the server — so the link comes
/// back to the leader to forward. The UI says that plainly rather than implying
/// a message was sent, because a leader who believes an SMS went out will not
/// follow up, and the invite simply never arrives.
class InvitesScreen extends ConsumerWidget {
  const InvitesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('निमंत्रण', style: TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: AsyncView<Community?>(
          value: ref.watch(myCommunityProvider),
          onRetry: () => ref.invalidate(myCommunityProvider),
          builder: (data) => data == null
              ? const Center(child: Text('कोई समुदाय नहीं मिला'))
              : _Invites(communityId: data.id),
        ),
      ),
    );
  }
}

class _Invites extends ConsumerStatefulWidget {
  const _Invites({required this.communityId});

  final String communityId;

  @override
  ConsumerState<_Invites> createState() => _InvitesState();
}

class _InvitesState extends ConsumerState<_Invites> {
  final TextEditingController _phone = TextEditingController();

  bool _isSending = false;
  String? _error;
  SentInvite? _lastSent;

  @override
  void initState() {
    super.initState();
    _phone.addListener(_onChanged);
  }

  void _onChanged() => setState(() => _error = null);

  @override
  void dispose() {
    _phone
      ..removeListener(_onChanged)
      ..dispose();
    super.dispose();
  }

  String get _digits => _phone.text.trim();
  bool get _isValid => AppConfig.isValidPhone(_digits);

  Future<void> _send() async {
    if (!_isValid || _isSending) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _isSending = true;
      _error = null;
    });

    try {
      final sent = await ref.read(communityApiProvider).sendInvite(widget.communityId, _digits);
      if (!mounted) return;

      _phone.clear();
      setState(() => _lastSent = sent);
      invalidateCommunityFrom(ref);
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      setState(() => _error = failure.debugDisplayMessage);
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _revoke(String inviteId) async {
    try {
      await ref.read(communityApiProvider).revokeInvite(widget.communityId, inviteId);
      if (!mounted) return;
      invalidateCommunityFrom(ref);
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      setState(() => _error = failure.debugDisplayMessage);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final invites = ref.watch(communityInvitesProvider(widget.communityId));

    return ListView(
      padding: const EdgeInsets.all(AppTheme.pagePadding),
      children: <Widget>[
        Text(
          'जिसे बुलाना है उसका मोबाइल नंबर डालें। उन्हें एक लिंक मिलेगा — '
          'बस दबाना है, कोई कोड नहीं डालना।',
          style: theme.textTheme.muted.copyWith(
            height: AppTheme.devanagariLineHeight,
          ),
        ),
        const SizedBox(height: 16),

        Row(
          children: <Widget>[
            Expanded(
              child: TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                inputFormatters: <TextInputFormatter>[
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(10),
                ],
                style: const TextStyle(fontSize: 19, letterSpacing: 1.5),
                decoration: InputDecoration(
                  hintText: '9876543210',
                  prefixText: '+91  ',
                  prefixStyle: TextStyle(
                    fontSize: 19,
                    color: theme.colorScheme.mutedForeground,
                  ),
                  filled: true,
                  fillColor: theme.colorScheme.muted,
                  contentPadding: const EdgeInsets.symmetric(
                    vertical: 16,
                    horizontal: 14,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            SizedBox(
              height: 56,
              child: ShadButton(
                onPressed: _isValid && !_isSending ? () => unawaited(_send()) : null,
                child: _isSending
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : const Text('बुलाएँ', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),

        if (_error != null) ...<Widget>[
          const SizedBox(height: 12),
          Text(
            _error!,
            style: theme.textTheme.p.copyWith(
              height: AppTheme.devanagariLineHeight,
              color: theme.colorScheme.destructive,
            ),
          ),
        ],

        if (_lastSent != null) ...<Widget>[
          const SizedBox(height: 16),
          _SentCard(sent: _lastSent!),
        ],

        const SizedBox(height: 28),
        Text(
          'भेजे गए निमंत्रण',
          style: theme.textTheme.h4.copyWith(height: AppTheme.devanagariLineHeight),
        ),
        const SizedBox(height: 12),

        AsyncView<Paged<Invite>>(
          value: invites,
          onRetry: () => ref.invalidate(communityInvitesProvider(widget.communityId)),
          builder: (data) {
            if (data.items.isEmpty) {
              return Text(
                'अभी तक कोई निमंत्रण नहीं भेजा गया।',
                style: theme.textTheme.muted.copyWith(
                  height: AppTheme.devanagariLineHeight,
                ),
              );
            }

            return Column(
              children: <Widget>[
                for (final invite in data.items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _InviteTile(
                      invite: invite,
                      onRevoke: () => unawaited(_revoke(invite.id)),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/// Shown once, right after sending.
///
/// Leads with the WhatsApp button, because while SMS is unconnected forwarding
/// is not a fallback — it is the delivery mechanism.
class _SentCard extends StatelessWidget {
  const _SentCard({required this.sent});

  final SentInvite sent;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF16A34A).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            sent.smsDelivered
                ? '${sent.invite.phoneMasked} को निमंत्रण भेज दिया गया।'
                : '${sent.invite.phoneMasked} के लिए लिंक तैयार है। '
                    'SMS अभी चालू नहीं है — आप खुद भेज दें।',
            style: theme.textTheme.p.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: AppTheme.minTapTarget,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF25D366),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => unawaited(
                ShareActions.openOrCopy(context, sent.whatsAppUrl),
              ),
              child: const Text('WhatsApp पर भेजें', style: TextStyle(fontSize: 16)),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: AppTheme.minTapTarget,
            child: ShadButton.outline(
              onPressed: () => unawaited(
                ShareActions.copy(context, sent.inviteUrl, label: 'लिंक कॉपी हो गया'),
              ),
              child: const Text('लिंक कॉपी करें', style: TextStyle(fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }
}

class _InviteTile extends StatelessWidget {
  const _InviteTile({required this.invite, required this.onRevoke});

  final Invite invite;
  final VoidCallback onRevoke;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  invite.phoneMasked,
                  style: theme.textTheme.large.copyWith(letterSpacing: 1),
                ),
                Text(
                  invite.statusLabel,
                  style: theme.textTheme.muted.copyWith(
                    height: AppTheme.devanagariLineHeight,
                    color: invite.status == InviteStatus.accepted
                        ? const Color(0xFF16A34A)
                        : theme.colorScheme.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
          if (invite.isUsable)
            IconButton(
              onPressed: onRevoke,
              tooltip: 'रद्द करें',
              iconSize: 22,
              // 44dp of touch area on a secondary action inside a list row; the
              // icon itself is small but the target must not be.
              constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
              icon: Icon(Icons.close_rounded, color: theme.colorScheme.mutedForeground),
            ),
        ],
      ),
    );
  }
}
