import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/async_view.dart';
import '../application/community_providers.dart';
import '../domain/community.dart';

/// Creating and editing a community, in one screen.
///
/// One widget rather than two because the fields, the validation and the layout
/// are identical — only the verb and the endpoint differ. Two near-copies would
/// drift the moment a field is added to one of them.
class CommunityFormScreen extends ConsumerWidget {
  const CommunityFormScreen({super.key, required this.mode});

  final CommunityFormMode mode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ShadTheme.of(context);
    final isCreate = mode == CommunityFormMode.create;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(
          isCreate ? 'समुदाय बनाएँ' : 'जानकारी बदलें',
          style: const TextStyle(fontSize: 18),
        ),
      ),
      body: SafeArea(
        child: isCreate
            ? const _Form(existing: null)
            : AsyncView<Community?>(
                value: ref.watch(myCommunityProvider),
                onRetry: () => ref.invalidate(myCommunityProvider),
                builder: (data) => data == null
                    ? const Center(child: Text('कोई समुदाय नहीं मिला'))
                    : _Form(existing: data),
              ),
      ),
    );
  }
}

enum CommunityFormMode { create, edit }

class _Form extends ConsumerStatefulWidget {
  const _Form({required this.existing});

  /// `null` in create mode. When present the fields start from it.
  final Community? existing;

  @override
  ConsumerState<_Form> createState() => _FormState();
}

class _FormState extends ConsumerState<_Form> {
  late final TextEditingController _name =
      TextEditingController(text: widget.existing?.name ?? '');
  late final TextEditingController _description =
      TextEditingController(text: widget.existing?.description ?? '');
  late final TextEditingController _state =
      TextEditingController(text: widget.existing?.state ?? '');
  late final TextEditingController _district =
      TextEditingController(text: widget.existing?.district ?? '');
  late final TextEditingController _city =
      TextEditingController(text: widget.existing?.city ?? '');
  late final TextEditingController _pincode =
      TextEditingController(text: widget.existing?.pincode ?? '');

  late CommunityType _type = widget.existing?.type ?? CommunityType.samaj;

  bool _isSaving = false;
  String? _error;

  /// Mirrors `communityNameSchema` on the server.
  static const int _minNameLength = 3;

  @override
  void initState() {
    super.initState();
    // One listener for the whole form: the Save button's enabled state depends
    // on the name, and nothing else here needs per-field reactivity.
    _name.addListener(_onNameChanged);
  }

  void _onNameChanged() => setState(() => _error = null);

  @override
  void dispose() {
    _name
      ..removeListener(_onNameChanged)
      ..dispose();
    _description.dispose();
    _state.dispose();
    _district.dispose();
    _city.dispose();
    _pincode.dispose();
    super.dispose();
  }

  bool get _isValid => _name.text.trim().length >= _minNameLength;

  Future<void> _save() async {
    if (!_isValid || _isSaving) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _isSaving = true;
      _error = null;
    });

    final api = ref.read(communityApiProvider);
    final existing = widget.existing;

    try {
      if (existing == null) {
        await api.create(
          name: _name.text,
          type: _type,
          description: _description.text,
          state: _state.text,
          district: _district.text,
          city: _city.text,
          pincode: _pincode.text,
        );
      } else {
        await api.update(
          existing.id,
          name: _name.text,
          type: _type,
          description: _description.text,
          state: _state.text,
          district: _district.text,
          city: _city.text,
          pincode: _pincode.text,
        );
      }

      if (!mounted) return;
      invalidateCommunityFrom(ref);
      context.pop();
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      setState(() => _error = failure.debugDisplayMessage);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final isCreate = widget.existing == null;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      behavior: HitTestBehavior.opaque,
      child: ListView(
        padding: const EdgeInsets.all(AppTheme.pagePadding),
        children: <Widget>[
          if (isCreate) ...<Widget>[
            Text(
              'बनाने के बाद यह मंज़ूरी के लिए जाएगा। मंज़ूरी मिलते ही सदस्य जुड़ने लगेंगे।',
              style: theme.textTheme.muted.copyWith(
                height: AppTheme.devanagariLineHeight,
              ),
            ),
            const SizedBox(height: 20),
          ],

          _Field(
            label: 'समुदाय का नाम',
            controller: _name,
            hint: 'गुप्ता समाज',
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 16),

          Text(
            'प्रकार',
            style: theme.textTheme.small.copyWith(
              height: AppTheme.devanagariLineHeight,
              color: theme.colorScheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 8),
          // A wrap of chips rather than a dropdown: seven options fit on screen,
          // and a dropdown hides the choices behind a tap for no benefit.
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              for (final type in CommunityType.values)
                _TypeChip(
                  type: type,
                  selected: type == _type,
                  onTap: () => setState(() => _type = type),
                ),
            ],
          ),
          const SizedBox(height: 16),

          _Field(
            label: 'विवरण',
            controller: _description,
            hint: 'जुड़ने से पहले लोग यही पढ़ेंगे',
            optional: true,
            maxLines: 3,
          ),
          const SizedBox(height: 24),

          Text(
            'जगह',
            style: theme.textTheme.h4.copyWith(height: AppTheme.devanagariLineHeight),
          ),
          const SizedBox(height: 4),
          Text(
            'जगह लिखने से लोग पहचान पाते हैं कि यही उनका समुदाय है।',
            style: theme.textTheme.muted.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
          const SizedBox(height: 12),

          _Field(label: 'राज्य', controller: _state, optional: true),
          const SizedBox(height: 12),
          _Field(label: 'ज़िला', controller: _district, optional: true),
          const SizedBox(height: 12),
          _Field(label: 'शहर / गाँव', controller: _city, optional: true),
          const SizedBox(height: 12),
          _Field(
            label: 'पिन कोड',
            controller: _pincode,
            optional: true,
            keyboardType: TextInputType.number,
            maxLength: 6,
            digitsOnly: true,
          ),

          if (_error != null) ...<Widget>[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.destructive.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _error!,
                style: theme.textTheme.p.copyWith(
                  height: AppTheme.devanagariLineHeight,
                  color: theme.colorScheme.destructive,
                ),
              ),
            ),
          ],

          const SizedBox(height: 24),
          SizedBox(
            height: 56,
            child: ShadButton(
              onPressed: _isValid && !_isSaving ? () => unawaited(_save()) : null,
              child: _isSaving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  : Text(
                      isCreate ? 'समुदाय बनाएँ' : 'सहेजें',
                      style: const TextStyle(fontSize: 17),
                    ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

// ── Pieces ───────────────────────────────────────────────────────────────────

class _Field extends StatelessWidget {
  const _Field({
    required this.label,
    required this.controller,
    this.hint,
    this.optional = false,
    this.maxLines = 1,
    this.maxLength,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.digitsOnly = false,
  });

  final String label;
  final TextEditingController controller;
  final String? hint;
  final bool optional;
  final int maxLines;
  final int? maxLength;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final bool digitsOnly;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          optional ? '$label (ज़रूरी नहीं)' : label,
          style: theme.textTheme.small.copyWith(
            height: AppTheme.devanagariLineHeight,
            color: theme.colorScheme.mutedForeground,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: maxLines,
          maxLength: maxLength,
          keyboardType: keyboardType,
          textCapitalization: textCapitalization,
          inputFormatters: digitsOnly
              ? <TextInputFormatter>[FilteringTextInputFormatter.digitsOnly]
              : null,
          // Comfortably larger than Material's default. This form is filled in
          // by a leader who may well be over 60.
          style: const TextStyle(fontSize: 17),
          decoration: InputDecoration(
            hintText: hint,
            counterText: '',
            filled: true,
            fillColor: theme.colorScheme.muted,
            contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: theme.colorScheme.primary, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

class _TypeChip extends StatelessWidget {
  const _TypeChip({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  final CommunityType type;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? theme.colorScheme.primary : theme.colorScheme.muted,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: selected ? theme.colorScheme.primary : theme.colorScheme.border,
          ),
        ),
        child: Text(
          type.label,
          style: theme.textTheme.p.copyWith(
            height: AppTheme.devanagariLineHeight,
            color: selected
                ? theme.colorScheme.primaryForeground
                : theme.colorScheme.foreground,
          ),
        ),
      ),
    );
  }
}
