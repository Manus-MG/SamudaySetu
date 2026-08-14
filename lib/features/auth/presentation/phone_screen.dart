import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/config/app_config.dart';
import '../../../core/media/app_images.dart';
import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/theme/motion.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/entrance.dart';

/// Step one of the only member login: enter a phone number.
///
/// There is no password and no "Sign up" — an unknown number creates the account
/// on OTP verification. Asking a first-time user to choose between Login and
/// Sign up is a decision they cannot make correctly, and support pays for it.
class PhoneScreen extends ConsumerStatefulWidget {
  const PhoneScreen({super.key});

  @override
  ConsumerState<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends ConsumerState<PhoneScreen> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  bool _isSubmitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChanged);
  }

  void _onChanged() {
    // One rebuild, not two: the button's enabled state tracks the text, and
    // clearing the error as the user edits keeps a stale "invalid number" from
    // sitting under a number they have already fixed.
    setState(() => _error = null);
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_onChanged)
      ..dispose();
    _focusNode.dispose();
    super.dispose();
  }

  String get _digits => _controller.text.trim();
  bool get _isValid => AppConfig.isValidPhone(_digits);

  Future<void> _submit() async {
    if (!_isValid || _isSubmitting) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final challenge = await ref.read(authApiProvider).requestOtp(_digits);
      if (!mounted) return;

      // The phone travels as `extra` rather than in the path: it is PII, and a
      // number in a route is a number in logs, crash reports and back-stack
      // dumps.
      context.push(
        AppRoutes.otp,
        extra: _digits,
      );

      // Surfaced only outside production, where the server has no SMS provider
      // wired up and hands the code back so the flow is testable.
      final devCode = challenge.devCode;
      if (devCode != null && mounted) {
        ShadToaster.of(context).show(
          ShadToast(
            title: const Text('Development mode'),
            description: Text('No SMS provider configured. Code: $devCode'),
          ),
        );
      }
    } on Object catch (error) {
      // Everything, not just ApiFailure. An unanticipated exception here
      // would escape past the `finally` that clears the spinner and leave
      // the user with a button that silently does nothing.
      final failure = ApiFailure.from(error);
      if (!mounted) return;
      setState(() => _error = failure.debugDisplayMessage);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: SafeArea(
        child: GestureDetector(
          // Tapping the background dismisses the keypad — on a 5" screen the
          // keypad covers the button, and users reach for "somewhere else".
          onTap: () => FocusScope.of(context).unfocus(),
          behavior: HitTestBehavior.opaque,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppTheme.pagePadding),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                const SizedBox(height: 12),

                // A photograph instead of the old 52dp icon tile. This is the
                // first screen a new member sees after onboarding, and it is
                // otherwise a heading, a hint and a number field — the point
                // where an app most looks like a form and least like something
                // their neighbours use.
                Entrance.staggered(
                  index: 0,
                  child: AppHeroImage(
                    image: AppImages.signIn,
                    aspectRatio: 16 / 9,
                    overlay: Text(
                      'समुदाय सेतु में आपका स्वागत है',
                      style: theme.textTheme.large.copyWith(
                        height: AppTheme.devanagariLineHeight,
                        color: AppPalette.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                Entrance.staggered(
                  index: 1,
                  child: Text(
                    'अपना मोबाइल नंबर दर्ज करें',
                    style: theme.textTheme.h3.copyWith(
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                Entrance.staggered(
                  index: 2,
                  child: Text(
                    'हम इस नंबर पर ${AppConfig.otpLength} अंकों का कोड भेजेंगे।',
                    style: theme.textTheme.muted.copyWith(
                      fontSize: 15,
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                Entrance.staggered(
                  index: 3,
                  child: ShadInput(
                    controller: _controller,
                    focusNode: _focusNode,
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.done,
                    autofocus: true,
                    onSubmitted: (_) => unawaited(_submit()),
                    placeholder: const Text('9876543210'),
                    leading: const Padding(
                      padding: EdgeInsets.only(right: 4),
                      child: Text('+91', style: TextStyle(fontSize: 16)),
                    ),
                    style: const TextStyle(fontSize: 18, letterSpacing: 1.2),
                    inputFormatters: <TextInputFormatter>[
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(AppConfig.phoneDigits),
                    ],
                  ),
                ),

                // Reserved height, so the layout does not jump when an error
                // appears and push the button out from under the thumb.
                SizedBox(
                  height: 34,
                  child: AnimatedSwitcher(
                    duration: Motion.fast,
                    child: _error == null
                        ? const SizedBox.shrink()
                        : Padding(
                            key: const ValueKey<String>('error'),
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              _error!,
                              style: theme.textTheme.small.copyWith(
                                color: theme.colorScheme.destructive,
                              ),
                            ),
                          ),
                  ),
                ),

                Entrance.staggered(
                  index: 4,
                  child: SizedBox(
                    height: AppTheme.minTapTarget,
                    child: ShadButton(
                      onPressed: _isValid && !_isSubmitting
                          ? () => unawaited(_submit())
                          : null,
                      child: _isSubmitting
                          ? SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: theme.colorScheme.primaryForeground,
                              ),
                            )
                          : const Text(
                              'कोड भेजें',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                            ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                Entrance.staggered(
                  index: 5,
                  child: Text(
                    'आगे बढ़ने पर आप हमारी शर्तों से सहमत होते हैं।',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.muted.copyWith(fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

