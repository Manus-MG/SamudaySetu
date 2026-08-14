import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/config/app_brand.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_illustration.dart';
import '../../../core/widgets/entrance.dart';
import '../domain/samaj_profile.dart';

/// What the samaj stands for, and what it wants this app to do.
///
/// The second half of the परिचय, split off rather than appended because the two
/// answer different questions. The first screen answers "who are we?" with
/// history; this one answers "what are we doing now?" — and a leader showing
/// the app to a room wants to be able to open the second one directly.
class SamajValuesScreen extends StatelessWidget {
  const SamajValuesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('मूल्य व उद्देश्य', style: TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTheme.pagePadding),
          children: <Widget>[
            const SizedBox(height: 8),

            Entrance.staggered(
              index: 0,
              child: Column(
                children: <Widget>[
                  const SizedBox(
                    height: 96,
                    child: AppIllustration(
                      motif: IllustrationMotif.community,
                      tone: IllustrationTone.soft,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    AppBrand.tagline,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.h4.copyWith(
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            Entrance.staggered(
              index: 1,
              child: Text(
                'हमारे मूल्य',
                style: theme.textTheme.h4.copyWith(
                  height: AppTheme.devanagariLineHeight,
                ),
              ),
            ),
            const SizedBox(height: 14),

            // A `Wrap` of half-width cards rather than a `GridView` with a
            // fixed `childAspectRatio`. The captions are Devanagari at 1.45
            // line height and this audience turns the system font size up — any
            // fixed ratio that fits at 1.0x overflows at 1.3x, and an overflow
            // stripe is the one thing that cannot be on screen during a demo.
            // Wrap lets each card take the height its text needs.
            Entrance.staggered(
              index: 2,
              child: LayoutBuilder(
                builder: (BuildContext context, BoxConstraints constraints) {
                  const double gap = 12;
                  final double cardWidth = (constraints.maxWidth - gap) / 2;

                  return Wrap(
                    spacing: gap,
                    runSpacing: gap,
                    children: <Widget>[
                      for (final SamajValue value in SamajProfile.values)
                        SizedBox(
                          width: cardWidth,
                          child: _ValueCard(value: value),
                        ),
                    ],
                  );
                },
              ),
            ),

            const SizedBox(height: 32),

            Entrance.staggered(
              index: 3,
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: theme.colorScheme.muted,
                  borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'हमारे उद्देश्य',
                      style: theme.textTheme.large.copyWith(
                        height: AppTheme.devanagariLineHeight,
                      ),
                    ),
                    const SizedBox(height: 12),
                    for (final String objective in SamajProfile.objectives)
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
                                objective,
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

            const SizedBox(height: 28),

            Entrance.staggered(
              index: 4,
              child: SizedBox(
                height: AppTheme.minTapTarget,
                child: ShadButton.outline(
                  // A deep link straight here has nothing to pop to; fall back
                  // to the परिचय rather than trapping the member on a leaf.
                  onPressed: () => context.canPop()
                      ? context.pop()
                      : context.go(AppRoutes.about),
                  child: const Text('वापस जाएँ', style: TextStyle(fontSize: 16)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ValueCard extends StatelessWidget {
  const _ValueCard({required this.value});

  final SamajValue value;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.card,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        border: Border.all(color: theme.colorScheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            height: 44,
            width: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: theme.colorScheme.muted,
              shape: BoxShape.circle,
            ),
            child: Icon(
              value.icon,
              size: 22,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            value.title,
            style: theme.textTheme.large.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value.detail,
            style: theme.textTheme.muted.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
        ],
      ),
    );
  }
}
