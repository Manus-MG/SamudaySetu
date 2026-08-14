import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/entrance.dart';

/// Entering the community code.
///
/// Every decision on this screen is downstream of one fact: the person holding
/// the code is often 65+, reading it off a WhatsApp forward or hearing it down a
/// phone line, on a cheap phone in bright sunlight.
///
///   - **The code is two ordinary Hindi words**, so the field accepts a space,
///     a hyphen or nothing between them. Punctuation is not information and is
///     never a reason to fail.
///   - **One field, not two boxes per word.** A two-box layout looks tidier and
///     breaks the moment someone's code is custom (`GUPTASAMAJ`) rather than
///     generated.
///   - **No live validation while typing.** Red text appearing under a
///     half-typed word reads as failure to someone who is already unsure.
///   - **The next step is a confirmation, not a join.** Nothing irreversible
///     happens until they have seen their community's name and agreed.
class JoinCommunityScreen extends ConsumerStatefulWidget {
  const JoinCommunityScreen({super.key, this.initialCode});

  /// Prefilled when arriving from a QR scan or a `/join/<code>` deep link, so
  /// that path involves no typing at all.
  final String? initialCode;

  @override
  ConsumerState<JoinCommunityScreen> createState() => _JoinCommunityScreenState();
}

class _JoinCommunityScreenState extends ConsumerState<JoinCommunityScreen> {
  late final TextEditingController _controller =
      TextEditingController(text: widget.initialCode ?? '');
  final FocusNode _focusNode = FocusNode();

  bool _isChecking = false;
  String? _error;

  /// Mirrors `JOIN_CODE_MIN_LENGTH` on the server, counted the same way: letters
  /// and digits only, separators ignored.
  static const int _minCodeLength = 4;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChanged);

    // A code that arrived by deep link is already correct — check it straight
    // away rather than making the user press a button to confirm what they
    // never typed.
    if ((widget.initialCode ?? '').isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_submit()));
    }
  }

  void _onChanged() {
    // Clearing the error as they edit stops a stale "code not found" sitting
    // under a code they have already corrected.
    if (_error != null) setState(() => _error = null);
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_onChanged)
      ..dispose();
    _focusNode.dispose();
    super.dispose();
  }

  /// Letters and digits only — the same normalisation the server performs.
  String get _normalised =>
      _controller.text.toUpperCase().replaceAll(RegExp('[^0-9A-Z]'), '');

  bool get _isLongEnough => _normalised.length >= _minCodeLength;

  Future<void> _submit() async {
    if (!_isLongEnough || _isChecking) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _isChecking = true;
      _error = null;
    });

    try {
      final preview = await ref.read(communityApiProvider).previewByCode(_controller.text.trim());
      if (!mounted) return;

      // Confirmation is a separate screen, not a dialog: a dialog on a 5" phone
      // is a small box over a busy background, and this is the one moment the
      // user must actually read something.
      context.push(AppRoutes.joinConfirm, extra: preview);
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      setState(() => _error = _friendlyError(failure));
    } finally {
      if (mounted) setState(() => _isChecking = false);
    }
  }

  /// Turns a failure into a sentence that says what to do next.
  ///
  /// "NOT_FOUND" is the common case and almost always a typo, so it names the
  /// likely fix instead of restating the error.
  String _friendlyError(ApiFailure failure) {
    // The friendly sentence still carries the technical suffix in debug builds:
    // "code not found" is the right thing to tell a member and the least useful
    // thing to tell someone debugging why a correct code is being rejected.
    final detail = kDebugMode ? '\n\n[${failure.statusCode ?? '-'} ${failure.code}]' : '';

    if (failure.code == ApiErrorCode.notFound) {
      return 'यह कोड नहीं मिला। कृपया दोबारा देखकर डालें।$detail';
    }
    if (failure.code == ApiErrorCode.rateLimited) {
      return 'बहुत बार कोशिश हुई। एक मिनट रुककर फिर से करें।$detail';
    }
    return failure.debugDisplayMessage;
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('समुदाय से जुड़ें', style: TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: GestureDetector(
          // On a 5" screen the keypad covers the button, and people reach for
          // "somewhere else" to dismiss it.
          onTap: () => FocusScope.of(context).unfocus(),
          behavior: HitTestBehavior.opaque,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppTheme.pagePadding),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Entrance.staggered(index: 0, child: const _Instruction()),
                const SizedBox(height: 28),
                Entrance.staggered(index: 1, child: _codeField(theme)),
                const SizedBox(height: 12),

                if (_error != null)
                  Entrance.staggered(index: 2, child: _ErrorNote(message: _error!)),

                const SizedBox(height: 16),
                Entrance.staggered(index: 3, child: _continueButton()),
                const SizedBox(height: 12),
                Entrance.staggered(index: 4, child: const _ScanButton()),
                const SizedBox(height: 24),
                Entrance.staggered(index: 5, child: const _HelpNote()),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _codeField(ShadThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          'समुदाय कोड',
          style: theme.textTheme.small.copyWith(
            height: AppTheme.devanagariLineHeight,
            color: theme.colorScheme.mutedForeground,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _controller,
          focusNode: _focusNode,
          autofocus: (widget.initialCode ?? '').isEmpty,
          textCapitalization: TextCapitalization.characters,
          textInputAction: TextInputAction.go,
          onSubmitted: (_) => unawaited(_submit()),
          maxLength: 40,
          autocorrect: false,
          enableSuggestions: false,
          // Large, wide-tracked and monospaced-feeling: this string gets compared
          // character by character against a piece of paper.
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w600,
            letterSpacing: 2,
          ),
          textAlign: TextAlign.center,
          inputFormatters: <TextInputFormatter>[
            // Uppercase as they type so what is on screen matches what is on the
            // poster, and drop characters the code can never contain rather than
            // letting them accumulate into a code that cannot work.
            TextInputFormatter.withFunction((oldValue, newValue) {
              final filtered = newValue.text.toUpperCase().replaceAll(RegExp('[^0-9A-Z -]'), '');
              // Clamp against the *filtered* length, in that order. Clamping the
              // other way round throws when the incoming selection is -1, which
              // is what some soft keyboards send while composing.
              final offset = newValue.selection.end.clamp(0, filtered.length);
              return TextEditingValue(
                text: filtered,
                selection: TextSelection.collapsed(offset: offset),
              );
            }),
          ],
          decoration: InputDecoration(
            hintText: 'सूरज कमल',
            counterText: '',
            hintStyle: TextStyle(
              fontSize: 22,
              letterSpacing: 1,
              color: theme.colorScheme.mutedForeground.withValues(alpha: 0.5),
            ),
            filled: true,
            fillColor: theme.colorScheme.muted,
            contentPadding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: theme.colorScheme.primary, width: 2),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'बीच में जगह या डैश हो तो कोई बात नहीं।',
          textAlign: TextAlign.center,
          style: theme.textTheme.muted.copyWith(height: AppTheme.devanagariLineHeight),
        ),
      ],
    );
  }

  Widget _continueButton() {
    return SizedBox(
      height: 56,
      child: ShadButton(
        onPressed:
            _isLongEnough && !_isChecking ? () => unawaited(_submit()) : null,
        child: _isChecking
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              )
            : const Text('आगे बढ़ें', style: TextStyle(fontSize: 17)),
      ),
    );
  }
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/// The way past this screen without typing anything.
///
/// Second, not first. A scan needs the other person present with their phone
/// unlocked and the QR on screen; the field above works with a code on a scrap
/// of paper or remembered from a phone call, which is the more common situation.
/// Offering the camera first would make the harder precondition look like the
/// expected one.
class _ScanButton extends StatelessWidget {
  const _ScanButton();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: AppTheme.minTapTarget,
      child: ShadButton.outline(
        onPressed: () => context.push(AppRoutes.joinScan),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(Icons.qr_code_scanner_rounded, size: 20),
            SizedBox(width: 8),
            Text('QR स्कैन करें', style: TextStyle(fontSize: 16)),
          ],
        ),
      ),
    );
  }
}

class _Instruction extends StatelessWidget {
  const _Instruction();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          'अपने समुदाय का कोड डालें',
          style: theme.textTheme.h3.copyWith(height: AppTheme.devanagariLineHeight),
        ),
        const SizedBox(height: 8),
        Text(
          'यह कोड आपको अपने समुदाय के नेता से मिलेगा — दो आसान शब्द, जैसे “सूरज कमल”।',
          style: theme.textTheme.p.copyWith(
            height: AppTheme.devanagariLineHeight,
            color: theme.colorScheme.mutedForeground,
          ),
        ),
      ],
    );
  }
}

class _ErrorNote extends StatelessWidget {
  const _ErrorNote({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.destructive.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(Icons.error_outline, size: 20, color: theme.colorScheme.destructive),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.p.copyWith(
                height: AppTheme.devanagariLineHeight,
                color: theme.colorScheme.destructive,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The escape hatch. Someone who cannot get the code in should be told to ask a
/// person, not left staring at a field.
class _HelpNote extends StatelessWidget {
  const _HelpNote();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(Icons.info_outline, size: 20, color: theme.colorScheme.mutedForeground),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'कोड नहीं है? अपने समुदाय के नेता से WhatsApp पर लिंक मँगवाएँ — '
              'उस लिंक को दबाते ही आप सीधे जुड़ जाएँगे।',
              style: theme.textTheme.muted.copyWith(height: AppTheme.devanagariLineHeight),
            ),
          ),
        ],
      ),
    );
  }
}
