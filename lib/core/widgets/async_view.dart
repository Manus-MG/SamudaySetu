import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../network/api_failure.dart';
import '../theme/app_theme.dart';

/// Renders the three states of an [AsyncValue] the same way everywhere.
///
/// Written once because the alternative is every screen inventing its own
/// spinner, its own error text and its own retry button — and then two of them
/// forgetting the retry. An error a user cannot retry from is a dead end, which
/// for this audience means uninstalling the app.
class AsyncView<T> extends StatelessWidget {
  const AsyncView({
    required this.value,
    required this.builder,
    required this.onRetry,
    this.loadingLabel,
    super.key,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) builder;
  final VoidCallback onRetry;
  final String? loadingLabel;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return value.when(
      data: builder,
      loading: () => Padding(
        padding: const EdgeInsets.symmetric(vertical: 48),
        child: Column(
          children: <Widget>[
            const CircularProgressIndicator(strokeWidth: 2.5),
            if (loadingLabel != null) ...<Widget>[
              const SizedBox(height: 14),
              Text(
                loadingLabel!,
                style: theme.textTheme.muted.copyWith(
                  height: AppTheme.devanagariLineHeight,
                ),
              ),
            ],
          ],
        ),
      ),
      error: (error, _) => _ErrorState(
        // `ApiFailure.displayMessage` is Hindi-first and already written for a
        // member to read; a raw `toString()` never is.
        message: error is ApiFailure
            ? error.displayMessage
            : 'कुछ गड़बड़ हुई। कृपया दोबारा प्रयास करें।',
        onRetry: onRetry,
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 8),
      child: Column(
        children: <Widget>[
          Icon(
            Icons.cloud_off_rounded,
            size: 44,
            color: theme.colorScheme.mutedForeground,
          ),
          const SizedBox(height: 16),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.p.copyWith(height: AppTheme.devanagariLineHeight),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: AppTheme.minTapTarget,
            child: ShadButton.outline(
              onPressed: onRetry,
              child: const Text('फिर से कोशिश करें', style: TextStyle(fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }
}
