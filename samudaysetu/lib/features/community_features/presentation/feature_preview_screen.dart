import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/entrance.dart';
import '../domain/community_feature.dart';

/// One screen for every unbuilt feature.
///
/// Seven near-identical "coming soon" screens is seven places for the copy to
/// drift and one place to forget when a feature ships. Everything that differs
/// between them already lives on [CommunityFeature], so this reads it.
///
/// The screen exists at all — rather than a tile that does nothing, or a toast
/// — because a tap that produces no navigation is indistinguishable from a bug.
/// For a member who is not sure they are using the phone correctly, "nothing
/// happened" is not a neutral outcome: it is evidence that they got it wrong.
class FeaturePreviewScreen extends StatelessWidget {
  const FeaturePreviewScreen({required this.feature, super.key});

  final CommunityFeature feature;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(feature.label, style: const TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTheme.pagePadding),
          children: <Widget>[
            const SizedBox(height: 12),

            Entrance.staggered(
              index: 0,
              child: Column(
                children: <Widget>[
                  Container(
                    height: 88,
                    width: 88,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.muted,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      feature.icon,
                      size: 42,
                      color: theme.colorScheme.foreground,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    feature.label,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.h3.copyWith(
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    feature.tagline,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.p.copyWith(
                      height: AppTheme.devanagariLineHeight,
                      color: theme.colorScheme.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ShadBadge.secondary(child: Text(_statusHeadline)),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // The point of the screen. "जल्द आ रहा है" on its own is what every
            // abandoned app says; three specific things the member will be able
            // to do is a claim somebody can be held to.
            Entrance.staggered(
              index: 1,
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: theme.colorScheme.muted,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'आप क्या-क्या कर पाएँगे',
                      style: theme.textTheme.large.copyWith(
                        height: AppTheme.devanagariLineHeight,
                      ),
                    ),
                    const SizedBox(height: 12),
                    for (final promise in feature.promises)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Icon(
                              Icons.check_circle_rounded,
                              size: 20,
                              color: theme.colorScheme.primary,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                promise,
                                style: theme.textTheme.p.copyWith(
                                  height: AppTheme.devanagariLineHeight,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            Entrance.staggered(
              index: 2,
              child: Text(
                'यह सुविधा अभी बन रही है। तैयार होते ही आपको ऐप में दिख जाएगी — '
                'कुछ करने की ज़रूरत नहीं।',
                textAlign: TextAlign.center,
                style: theme.textTheme.muted.copyWith(
                  height: AppTheme.devanagariLineHeight,
                ),
              ),
            ),

            const SizedBox(height: 28),

            Entrance.staggered(
              index: 3,
              child: SizedBox(
                height: AppTheme.minTapTarget,
                child: ShadButton.outline(
                  // `pop` when there is somewhere to pop to — the member came
                  // from the community screen and expects to land back on it.
                  // A deep link straight here has an empty stack, so fall back
                  // to the community screen rather than trapping them.
                  onPressed: () => context.canPop()
                      ? context.pop()
                      : context.go(AppRoutes.myCommunity),
                  child: const Text('वापस जाएँ', style: TextStyle(fontSize: 16)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String get _statusHeadline => switch (feature.status) {
        FeatureStatus.live => 'उपलब्ध है',
        FeatureStatus.preview => 'नमूना उपलब्ध है',
        FeatureStatus.comingSoon => 'जल्द आ रहा है',
      };
}
