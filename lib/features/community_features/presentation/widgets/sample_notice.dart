import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/app_theme.dart';

/// Says, plainly, that what follows is an example.
///
/// Not a subtle grey footnote. The audience for this app is often reading in
/// their second script on a phone in the sun, and a member who travels to an
/// invented health camp has been lied to by the software. So this is a filled
/// band at the top of the screen, above the content it qualifies, in the
/// warning colour — the one place in the app where being visually loud is the
/// correct call.
class SampleNotice extends StatelessWidget {
  const SampleNotice({required this.message, super.key});

  /// What exactly is a sample, in the member's words.
  final String message;

  /// Amber rather than the theme's destructive red. Nothing has gone wrong —
  /// red would read as an error the member caused, which is the opposite of the
  /// intended "this is a preview, look around" tone.
  static const Color _tint = Color(0xFFB45309);
  static const Color _surface = Color(0x1AF59E0B);

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _tint.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Icon(Icons.info_outline_rounded, size: 20, color: _tint),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.small.copyWith(
                height: AppTheme.devanagariLineHeight,
                color: _tint,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
