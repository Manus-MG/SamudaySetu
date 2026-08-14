import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/motion.dart';
import '../../../core/widgets/entrance.dart';
import '../application/session_controller.dart';

/// Step two: enter the 6-digit code.
///
/// Two pieces of motion earn their place here. A wrong code shakes the field,
/// which is understood without reading — and this screen's users may not read
/// the error at all. A correct code plays a brief success beat before the
/// navigation, so the transition feels like a consequence rather than a jump.
class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({required this.phone, super.key});

  /// Ten digits, no country code. The server normalises to E.164.
  final String phone;

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  /// Rebuilding the OTP field with a new key clears it. Used after a wrong code
  /// so the user is not left backspacing six times.
  int _fieldGeneration = 0;

  /// Drives the shake. Incremented on each rejection so a second wrong code
  /// replays the animation instead of sitting still.
  int _shakeGeneration = 0;

  String _code = '';
  bool _isVerifying = false;
  bool _isSuccess = false;
  bool _isResending = false;
  String? _error;

  Timer? _cooldownTimer;
  int _secondsUntilResend = 0;

  @override
  void initState() {
    super.initState();
    _startCooldown(AppConfig.otpResendCooldown.inSeconds);
  }

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    super.dispose();
  }

  void _startCooldown(int seconds) {
    _cooldownTimer?.cancel();
    setState(() => _secondsUntilResend = seconds);

    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_secondsUntilResend <= 1) {
        timer.cancel();
        setState(() => _secondsUntilResend = 0);
        return;
      }
      setState(() => _secondsUntilResend--);
    });
  }

  /// Incomplete slots come back as spaces, so length alone is not enough.
  bool get _isComplete =>
      _code.length == AppConfig.otpLength && !_code.contains(' ');

  Future<void> _verify() async {
    if (!_isComplete || _isVerifying || _isSuccess) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _isVerifying = true;
      _error = null;
    });

    try {
      final deviceId = await ref.read(secureStorageProvider).readOrCreateDeviceId();
      final result = await ref.read(authApiProvider).verifyOtp(
            phone: widget.phone,
            otp: _code,
            deviceId: deviceId,
          );

      if (!mounted) return;
      setState(() => _isSuccess = true);
      unawaited(HapticFeedback.lightImpact());

      // Let the success state land before the route changes. Signing in flips
      // the router immediately, so without this the tick is never seen.
      await Future<void>.delayed(Motion.slow);
      if (!mounted) return;

      await ref.read(sessionControllerProvider.notifier).signIn(result);
      // No explicit navigation: the router redirects on the session change.
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      unawaited(HapticFeedback.mediumImpact());
      setState(() {
        _error = failure.debugDisplayMessage;
        _isVerifying = false;
        _shakeGeneration++;
        // Only clear the field when the code itself was wrong. A network blip
        // should not cost the user six digits they typed correctly.
        if (failure.isOtpRejection) {
          _fieldGeneration++;
          _code = '';
        }
      });
    }
  }

  Future<void> _resend() async {
    if (_secondsUntilResend > 0 || _isResending) return;

    setState(() {
      _isResending = true;
      _error = null;
    });

    try {
      final challenge = await ref.read(authApiProvider).requestOtp(widget.phone);
      if (!mounted) return;

      setState(() {
        _fieldGeneration++;
        _code = '';
      });
      _startCooldown(challenge.resendAfterSeconds);

      final devCode = challenge.devCode;
      ShadToaster.of(context).show(
        ShadToast(
          title: const Text('कोड भेज दिया गया'),
          description: Text(
            devCode == null
                ? 'नया कोड आपके नंबर पर भेजा गया है।'
                : 'Development mode — code: $devCode',
          ),
        ),
      );
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      setState(() => _error = failure.debugDisplayMessage);
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppTheme.pagePadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Align(
                alignment: Alignment.centerLeft,
                child: ShadButton.ghost(
                  onPressed: () => context.pop(),
                  child: const Icon(LucideIcons.arrowLeft, size: 20),
                ),
              ),
              const SizedBox(height: 24),

              Entrance.staggered(
                index: 0,
                child: Text(
                  'कोड दर्ज करें',
                  style: theme.textTheme.h3.copyWith(
                    height: AppTheme.devanagariLineHeight,
                  ),
                ),
              ),
              const SizedBox(height: 8),

              Entrance.staggered(
                index: 1,
                child: Row(
                  children: <Widget>[
                    Flexible(
                      child: Text(
                        '+91 ${widget.phone} पर भेजा गया',
                        style: theme.textTheme.muted.copyWith(fontSize: 15),
                      ),
                    ),
                    ShadButton.link(
                      onPressed: _isVerifying || _isSuccess ? null : () => context.pop(),
                      child: const Text('बदलें'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              Entrance.staggered(
                index: 2,
                child: _OtpField(
                  // Two keys, two jobs: the field key resets the input, the
                  // shake key replays the animation.
                  key: ValueKey<int>(_fieldGeneration),
                  shakeGeneration: _shakeGeneration,
                  enabled: !_isVerifying && !_isSuccess,
                  onChanged: (value) {
                    setState(() {
                      _code = value;
                      if (_error != null) _error = null;
                    });
                    // Auto-submit on the sixth digit. Making the user find a
                    // button after typing the last digit is a step for nothing.
                    if (_isComplete) unawaited(_verify());
                  },
                ),
              ),

              SizedBox(
                height: 40,
                child: Center(child: _statusLine(theme)),
              ),

              SizedBox(
                height: AppTheme.minTapTarget,
                child: ShadButton(
                  onPressed: _isComplete && !_isVerifying && !_isSuccess
                      ? () => unawaited(_verify())
                      : null,
                  child: _buttonLabel(theme),
                ),
              ),
              const SizedBox(height: 20),

              _ResendRow(
                secondsRemaining: _secondsUntilResend,
                isResending: _isResending,
                enabled: !_isVerifying && !_isSuccess,
                onResend: _resend,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusLine(ShadThemeData theme) {
    if (_isSuccess) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(LucideIcons.check, size: 18, color: theme.colorScheme.primary),
          const SizedBox(width: 6),
          Text(
            'सत्यापित',
            style: theme.textTheme.small.copyWith(color: theme.colorScheme.primary),
          ),
        ],
      ).animate().fadeIn(duration: Motion.fast).scaleXY(
            begin: 0.85,
            end: 1,
            duration: Motion.normal,
            curve: Motion.spring,
          );
    }

    if (_error != null) {
      return Text(
        _error!,
        textAlign: TextAlign.center,
        style: theme.textTheme.small.copyWith(color: theme.colorScheme.destructive),
      ).animate().fadeIn(duration: Motion.fast);
    }

    return const SizedBox.shrink();
  }

  Widget _buttonLabel(ShadThemeData theme) {
    if (_isVerifying) {
      return SizedBox.square(
        dimension: 18,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: theme.colorScheme.primaryForeground,
        ),
      );
    }
    return const Text(
      'सत्यापित करें',
      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
    );
  }
}

/// The code input, wrapped in the shake.
///
/// Split out so the shake animation rebuilds without the whole screen, and so
/// the reset key applies to the input alone.
class _OtpField extends StatelessWidget {
  const _OtpField({
    required this.shakeGeneration,
    required this.enabled,
    required this.onChanged,
    super.key,
  });

  final int shakeGeneration;
  final bool enabled;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    // Locked out with `AbsorbPointer` rather than a disabled flag so the digits
    // stay visible and legible while the code is being checked.
    final field = ShadInputOTP(
      maxLength: AppConfig.otpLength,
      keyboardType: TextInputType.number,
      inputFormatters: <TextInputFormatter>[FilteringTextInputFormatter.digitsOnly],
      onChanged: onChanged,
      children: const <Widget>[
        ShadInputOTPGroup(
          children: <Widget>[
            ShadInputOTPSlot(),
            ShadInputOTPSlot(),
            ShadInputOTPSlot(),
          ],
        ),
        SizedBox(width: 12),
        ShadInputOTPGroup(
          children: <Widget>[
            ShadInputOTPSlot(),
            ShadInputOTPSlot(),
            ShadInputOTPSlot(),
          ],
        ),
      ],
    );

    final guarded = AbsorbPointer(absorbing: !enabled, child: field);

    if (shakeGeneration == 0) return Center(child: guarded);

    // A fresh key on every rejection remounts `Animate`, which is what makes a
    // second wrong code shake again rather than sit still.
    return Center(
      child: Animate(
        key: ValueKey<int>(shakeGeneration),
        effects: const <Effect<dynamic>>[
          ShakeEffect(duration: Duration(milliseconds: 420), hz: 5, offset: Offset(7, 0)),
        ],
        child: guarded,
      ),
    );
  }
}

class _ResendRow extends StatelessWidget {
  const _ResendRow({
    required this.secondsRemaining,
    required this.isResending,
    required this.enabled,
    required this.onResend,
  });

  final int secondsRemaining;
  final bool isResending;
  final bool enabled;
  final Future<void> Function() onResend;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final canResend = enabled && secondsRemaining == 0 && !isResending;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        Text('कोड नहीं मिला?', style: theme.textTheme.muted.copyWith(fontSize: 14)),
        const SizedBox(width: 4),
        ShadButton.link(
          onPressed: canResend ? () => unawaited(onResend()) : null,
          child: Text(
            isResending
                ? 'भेजा जा रहा है…'
                : secondsRemaining > 0
                    ? 'दोबारा भेजें ($secondsRemaining)'
                    : 'दोबारा भेजें',
          ),
        ),
      ],
    );
  }
}
