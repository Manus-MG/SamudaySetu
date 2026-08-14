import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../theme/app_theme.dart';
import 'app_illustration.dart';

/// The one way this app says "there is nothing here".
///
/// Written once because an empty list is where a user decides whether the app
/// is working or broken, and a bare line of grey text reads as broken. An
/// illustration, a sentence in plain Hindi and — where there is one — a way
/// forward reads as a state the designers anticipated.
///
/// [action] is optional but strongly preferred. An empty screen with no next
/// step is a dead end, and for this audience a dead end means closing the app.
class EmptyState extends StatelessWidget {
  const EmptyState({
    required this.motif,
    required this.title,
    this.message,
    this.action,
    this.compact = false,
    super.key,
  });

  final IllustrationMotif motif;
  final String title;
  final String? message;
  final Widget? action;

  /// Set when this sits inside a card rather than owning the screen.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: AppTheme.gutter,
        vertical: compact ? 24 : 44,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          AppIllustration(motif: motif, size: compact ? 96 : 132),
          SizedBox(height: compact ? 12 : 20),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.h4.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
          if (message != null) ...<Widget>[
            const SizedBox(height: 6),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: theme.textTheme.muted.copyWith(
                fontSize: 15,
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          ],
          if (action != null) ...<Widget>[
            const SizedBox(height: 22),
            SizedBox(height: AppTheme.minTapTarget, child: action),
          ],
        ],
      ),
    );
  }
}
