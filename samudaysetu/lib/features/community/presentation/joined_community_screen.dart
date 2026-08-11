import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/entrance.dart';
import '../domain/community.dart';

/// Confirmation that they are in.
///
/// A dedicated screen rather than a toast on the home screen, because for
/// someone who was unsure the whole way through, a message that disappears after
/// three seconds is not confirmation — it is one more thing they might have
/// missed. This waits for them, says the community's name back, and offers a
/// single obvious way forward.
class JoinedCommunityScreen extends StatelessWidget {
  const JoinedCommunityScreen({super.key, required this.community});

  final Community community;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.pagePadding),
          child: Column(
            children: <Widget>[
              const Spacer(),

              Entrance.staggered(
                index: 0,
                child: Container(
                  height: 96,
                  width: 96,
                  decoration: const BoxDecoration(
                    color: Color(0xFF16A34A),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_rounded, size: 56, color: Colors.white),
                ),
              ),

              const SizedBox(height: 28),

              Entrance.staggered(
                index: 1,
                child: Text(
                  'आप जुड़ गए!',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.h2.copyWith(height: AppTheme.devanagariLineHeight),
                ),
              ),

              const SizedBox(height: 10),

              Entrance.staggered(
                index: 2,
                child: Text(
                  community.name,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.h4.copyWith(
                    height: AppTheme.devanagariLineHeight,
                    color: theme.colorScheme.mutedForeground,
                  ),
                ),
              ),

              const Spacer(),

              Entrance.staggered(
                index: 3,
                child: SizedBox(
                  height: 56,
                  width: double.infinity,
                  child: ShadButton(
                    // `go`, not `push`: the join flow is finished and must not
                    // be reachable behind the home screen.
                    onPressed: () => context.go(AppRoutes.home),
                    child: const Text('आगे बढ़ें', style: TextStyle(fontSize: 17)),
                  ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
