import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/config/app_brand.dart';
import '../../../core/media/app_images.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/entrance.dart';
import '../domain/samaj_profile.dart';

/// Who this samaj is, before the app asks anybody to join anything.
///
/// Every other screen in the app is about the member's own community record —
/// join a code, see the members, read the events. This one is about the samaj
/// itself, and it is reachable from every role including a member who has not
/// joined anything yet. That is deliberate: a person deciding whether this app
/// is *theirs* is answering a question about identity, not about features, and
/// nothing else in the app answers it.
///
/// All copy comes from [SamajProfile] and none of it is written here. See that
/// file for why — in short, the history is a draft the samaj is expected to
/// correct, and corrections must not require touching a widget.
class AboutSamajScreen extends StatelessWidget {
  const AboutSamajScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('संघ परिचय', style: TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTheme.pagePadding),
          children: <Widget>[
            Entrance.staggered(
              index: 0,
              child: AppHeroImage(
                image: AppImages.samajHeritage,
                overlay: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      AppBrand.shortName,
                      style: theme.textTheme.h3.copyWith(
                        height: AppTheme.devanagariLineHeight,
                        color: AppPalette.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      AppBrand.motto,
                      style: theme.textTheme.p.copyWith(
                        fontSize: 14,
                        height: AppTheme.devanagariLineHeight,
                        color: AppPalette.white.withValues(alpha: 0.88),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 28),

            // What the association is, first. A member reading this screen is
            // deciding whether joining buys them anything; every panel below is
            // detail on an answer this one has to give in three lines.
            Entrance.staggered(
              index: 1,
              child: _Panel(
                title: SamajProfile.nameMeaningHeading,
                child: Text(
                  SamajProfile.nameMeaning,
                  style: theme.textTheme.p.copyWith(
                    height: AppTheme.devanagariLineHeight,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 20),

            Entrance.staggered(
              index: 2,
              child: _Panel(
                title: 'संघ की शुरुआत',
                child: Text(
                  SamajProfile.origin,
                  style: theme.textTheme.p.copyWith(
                    height: AppTheme.devanagariLineHeight,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 32),

            Entrance.staggered(
              index: 3,
              child: const _SectionHeading(text: 'हमारा इतिहास'),
            ),
            const SizedBox(height: 16),

            // Not a ListView: this is inside one already, and a fixed handful
            // of const rows costs less than a nested scrollable that has to be
            // shrink-wrapped anyway.
            for (int i = 0; i < SamajProfile.milestones.length; i++)
              Entrance.staggered(
                index: 4 + i,
                child: _MilestoneTile(
                  milestone: SamajProfile.milestones[i],
                  isLast: i == SamajProfile.milestones.length - 1,
                ),
              ),

            const SizedBox(height: 20),

            Entrance.staggered(
              index: 10,
              child: const _SectionHeading(text: 'हमारे क्षेत्र'),
            ),
            const SizedBox(height: 12),
            Entrance.staggered(
              index: 11,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: <Widget>[
                  for (final String region in SamajProfile.regions)
                    ShadBadge.secondary(child: Text(region)),
                ],
              ),
            ),

            const SizedBox(height: 28),

            Entrance.staggered(
              index: 12,
              child: Text(
                SamajProfile.sourceNote,
                textAlign: TextAlign.center,
                style: theme.textTheme.muted.copyWith(
                  height: AppTheme.devanagariLineHeight,
                ),
              ),
            ),

            const SizedBox(height: 24),

            Entrance.staggered(
              index: 13,
              child: SizedBox(
                height: AppTheme.minTapTarget,
                child: ShadButton(
                  onPressed: () => context.push(AppRoutes.aboutValues),
                  child: const Text(
                    'मूल्य व उद्देश्य देखें',
                    style: TextStyle(fontSize: 16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A titled block of prose on the muted surface.
class _Panel extends StatelessWidget {
  const _Panel({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            title,
            style: theme.textTheme.large.copyWith(
              height: AppTheme.devanagariLineHeight,
            ),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Text(
      text,
      style: theme.textTheme.h4.copyWith(
        height: AppTheme.devanagariLineHeight,
      ),
    );
  }
}

/// One row of the history timeline.
///
/// The rail is two plain `Container`s rather than a `CustomPainter` or a
/// package: a dot and a line is not enough drawing to justify either, and
/// building it out of boxes means it inherits the theme's colours for free and
/// stays legible when the user turns their font size up — the connector's
/// height comes from the text beside it, so nothing can desynchronise.
class _MilestoneTile extends StatelessWidget {
  const _MilestoneTile({required this.milestone, required this.isLast});

  final SamajMilestone milestone;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          SizedBox(
            width: 24,
            child: Column(
              children: <Widget>[
                const SizedBox(height: 6),
                Container(
                  height: 12,
                  width: 12,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      color: theme.colorScheme.border,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    milestone.period,
                    style: theme.textTheme.small.copyWith(
                      height: AppTheme.devanagariLineHeight,
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    milestone.title,
                    style: theme.textTheme.large.copyWith(
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    milestone.detail,
                    style: theme.textTheme.p.copyWith(
                      height: AppTheme.devanagariLineHeight,
                      color: theme.colorScheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
