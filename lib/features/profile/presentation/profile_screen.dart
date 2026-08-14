import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/entrance.dart';
import '../../auth/application/session_controller.dart';
import '../../auth/domain/app_user.dart';

/// The account screen, shared by members and leaders.
///
/// Two things a signed-in person can actually change — their name and their
/// language — plus signing out. Everything else about the account is set by the
/// server or by staff, and offering a control that always fails is worse than
/// offering none.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  late final TextEditingController _name = TextEditingController(
    text: ref.read(sessionControllerProvider).user?.fullName ?? '',
  );

  bool _isSaving = false;
  bool _isSigningOut = false;
  String? _error;
  String? _savedNotice;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.length < 2 || _isSaving) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _isSaving = true;
      _error = null;
      _savedNotice = null;
    });

    try {
      await ref.read(authApiProvider).updateProfile(fullName: name);
      // Re-read rather than patching local state: the server applies its own
      // trimming and may flip `status` from PENDING_PROFILE to ACTIVE, and
      // guessing at that here would put the two out of step.
      await ref.read(sessionControllerProvider.notifier).refreshUser();

      if (!mounted) return;
      setState(() => _savedNotice = 'सहेज लिया गया');
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

  Future<void> _signOut() async {
    setState(() => _isSigningOut = true);
    // The router redirects on the state change; no navigation needed here.
    await ref.read(sessionControllerProvider.notifier).signOut();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final user = ref.watch(sessionControllerProvider).user;

    if (user == null) {
      // The router redirects on sign-out; this is the single frame in between.
      return const Scaffold(body: SizedBox.shrink());
    }

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('मेरा खाता', style: TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          behavior: HitTestBehavior.opaque,
          child: ListView(
            padding: const EdgeInsets.all(AppTheme.pagePadding),
            children: <Widget>[
              Entrance.staggered(index: 0, child: _Avatar(user: user)),
              const SizedBox(height: 28),

              Entrance.staggered(
                index: 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Text(
                      'आपका नाम',
                      style: theme.textTheme.small.copyWith(
                        height: AppTheme.devanagariLineHeight,
                        color: theme.colorScheme.mutedForeground,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      style: const TextStyle(fontSize: 18),
                      onChanged: (_) => setState(() {
                        _error = null;
                        _savedNotice = null;
                      }),
                      decoration: InputDecoration(
                        hintText: 'पूरा नाम',
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
                    const SizedBox(height: 12),
                    SizedBox(
                      height: AppTheme.minTapTarget,
                      child: ShadButton(
                        onPressed: _isSaving ? null : () => unawaited(_save()),
                        child: Text(
                          _isSaving ? 'सहेजा जा रहा है…' : 'सहेजें',
                          style: const TextStyle(fontSize: 16),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              if (_savedNotice != null) ...<Widget>[
                const SizedBox(height: 10),
                Text(
                  _savedNotice!,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.muted.copyWith(
                    color: const Color(0xFF16A34A),
                  ),
                ),
              ],

              if (_error != null) ...<Widget>[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.p.copyWith(
                    height: AppTheme.devanagariLineHeight,
                    color: theme.colorScheme.destructive,
                  ),
                ),
              ],

              const SizedBox(height: 28),
              Entrance.staggered(index: 2, child: _Details(user: user)),

              const SizedBox(height: 32),
              Entrance.staggered(
                index: 3,
                child: SizedBox(
                  height: AppTheme.minTapTarget,
                  child: ShadButton.outline(
                    onPressed: _isSigningOut ? null : () => unawaited(_signOut()),
                    child: Text(
                      _isSigningOut ? 'बाहर निकल रहे हैं…' : 'लॉग आउट',
                      style: const TextStyle(fontSize: 16),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Column(
      children: <Widget>[
        Container(
          height: 76,
          width: 76,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: theme.colorScheme.muted,
            shape: BoxShape.circle,
          ),
          child: Text(
            user.initials,
            style: theme.textTheme.h2.copyWith(height: 1),
          ),
        ),
        const SizedBox(height: 12),
        ShadBadge.secondary(child: Text(user.role.label)),
      ],
    );
  }
}

class _Details extends StatelessWidget {
  const _Details({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: <Widget>[
          _Row(label: 'मोबाइल', value: user.phone ?? '—'),
          Divider(height: 1, color: theme.colorScheme.border),
          _Row(label: 'भूमिका', value: user.role.label),
        ],
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
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Row(
        children: <Widget>[
          Text(
            label,
            style: theme.textTheme.muted.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: theme.textTheme.p.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
        ],
      ),
    );
  }
}
