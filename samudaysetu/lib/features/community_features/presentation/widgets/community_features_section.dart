import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/theme/app_theme.dart';
import '../../domain/community_feature.dart';

/// The answer to "I joined — now what?".
///
/// This sits on the member's community screen because that is where the
/// question is asked. It is deliberately a *section* rather than a screen: a
/// member who has just joined should see what membership gets them without
/// having to discover another tap, and a separate "features" destination would
/// be a page nobody navigates to twice.
///
/// The honesty rules are in [CommunityFeature]. This widget only lays them out.
class CommunityFeaturesSection extends StatelessWidget {
  const CommunityFeaturesSection({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          'अब आपको मिलेगा',
          style: theme.textTheme.h4.copyWith(height: AppTheme.devanagariLineHeight),
        ),
        const SizedBox(height: 4),
        Text(
          'समुदाय से जुड़ने पर ये सुविधाएँ आपके लिए खुल रही हैं।',
          style: theme.textTheme.muted.copyWith(
            height: AppTheme.devanagariLineHeight,
          ),
        ),
        const SizedBox(height: 14),

        // Events first and full-width: it is the only entry with something real
        // to look at, and giving it the same 1/2-width tile as six placeholders
        // would waste the app's single piece of evidence that any of this is
        // being built.
        const _FeatureHighlight(feature: CommunityFeature.events),

        const SizedBox(height: 10),

        // Two columns. Three would put four Devanagari words on two lines each
        // at the default text size, and one would make six rows of scrolling.
        for (int row = 0; row < CommunityFeature.grid.length; row += 2)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: IntrinsicHeight(
              // Both tiles in a row match the taller one. `IntrinsicHeight` adds
              // a layout pass, which is a real cost — but over two leaf tiles
              // with no nested scrollables it is immeasurable, and the
              // alternative (a hard-coded height) clips the moment the user
              // turns up their font size, which this audience does.
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Expanded(child: _FeatureTile(feature: CommunityFeature.grid[row])),
                  const SizedBox(width: 10),
                  Expanded(
                    child: row + 1 < CommunityFeature.grid.length
                        ? _FeatureTile(feature: CommunityFeature.grid[row + 1])
                        // An odd-length list leaves a hole rather than a
                        // stretched tile that pretends to be a different size.
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// The one feature with something to show, given room to say so.
class _FeatureHighlight extends StatelessWidget {
  const _FeatureHighlight({required this.feature});

  final CommunityFeature feature;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return _Tappable(
      onTap: () => context.push(AppRoutes.communityEvents),
      borderRadius: 16,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: theme.colorScheme.muted,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: theme.colorScheme.border),
        ),
        child: Row(
          children: <Widget>[
            Container(
              height: 46,
              width: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                feature.icon,
                size: 24,
                color: theme.colorScheme.primaryForeground,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Flexible(
                        child: Text(
                          feature.label,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.large.copyWith(
                            height: AppTheme.devanagariLineHeight,
                          ),
                        ),
                      ),
                      if (feature.statusLabel != null) ...<Widget>[
                        const SizedBox(width: 8),
                        _StatusChip(label: feature.statusLabel!),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    feature.tagline,
                    style: theme.textTheme.muted.copyWith(
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.chevron_right_rounded,
              color: theme.colorScheme.mutedForeground,
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({required this.feature});

  final CommunityFeature feature;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return _Tappable(
      onTap: () => context.push(AppRoutes.communityFeature(feature.slug)),
      borderRadius: 14,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          // Outlined rather than filled, unlike the events card above. The
          // difference is doing work: filled reads as "here is a thing",
          // outlined as "here is a space reserved for a thing" — which is
          // exactly the status of every tile in this grid.
          color: theme.colorScheme.background,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: theme.colorScheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(feature.icon, size: 24, color: theme.colorScheme.foreground),
                if (feature.statusLabel != null)
                  _StatusChip(label: feature.statusLabel!),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              feature.label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.small.copyWith(
                height: AppTheme.devanagariLineHeight,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              feature.tagline,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.muted.copyWith(
                fontSize: 12,
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: theme.colorScheme.border),
      ),
      child: Text(
        label,
        style: theme.textTheme.muted.copyWith(
          fontSize: 11,
          height: 1.1,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// An ink-splashing tap target that clips to the child's own corner radius.
///
/// `InkWell` paints its splash on the nearest `Material` ancestor, which is
/// *behind* a `Container` with its own background — so a bare `InkWell` around
/// a decorated box produces a splash nobody can see. `Material` with a
/// transparent type puts the ink surface in front of the decoration instead.
class _Tappable extends StatelessWidget {
  const _Tappable({
    required this.onTap,
    required this.child,
    required this.borderRadius,
  });

  final VoidCallback onTap;
  final Widget child;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(borderRadius);

    return Stack(
      // `passthrough` forwards the incoming constraints to the decorated child.
      // Without it the child is laid out loose and a tile in a stretched row
      // stops short of the row's height, leaving a visible gap under the
      // shorter of the two.
      fit: StackFit.passthrough,
      children: <Widget>[
        child,
        Positioned.fill(
          child: Material(
            type: MaterialType.transparency,
            child: InkWell(onTap: onTap, borderRadius: radius),
          ),
        ),
      ],
    );
  }
}
