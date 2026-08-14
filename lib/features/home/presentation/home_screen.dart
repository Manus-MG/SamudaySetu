import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/media/app_images.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/app_illustration.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/app_tappable.dart';
import '../../../core/widgets/entrance.dart';
import '../../auth/application/session_controller.dart';
import '../../auth/domain/app_user.dart';
import '../../community/application/community_providers.dart';
import '../../community/domain/community.dart';
import '../../community_features/domain/community_feature.dart';

/// Where a signed-in member lands.
///
/// The screen answers three questions in the order a member asks them: who am
/// I, what do I belong to, and what can I do next. Everything on it is either
/// real data from the API or explicitly labelled as not built yet — there are
/// no invented counters, because the first fake number a member notices is the
/// last number they believe.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ShadTheme.of(context);
    final AppUser? user =
        ref.watch(sessionControllerProvider.select((state) => state.user));

    if (user == null) {
      // The router redirects on sign-out; this is the single frame in between.
      return const Scaffold(body: SizedBox.shrink());
    }

    // Membership, not [AppUser.needsCommunity]: an admin signed in on the phone
    // has no community either, and should see the same "join something" screen
    // rather than a card describing a community that does not exist.
    final bool hasCommunity = user.communityId != null;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      drawer: const AppDrawer(),
      body: RefreshIndicator(
        // Pull-to-refresh re-reads both halves of what this screen shows: the
        // community, and the user record that decides which half is shown.
        onRefresh: () async {
          ref.invalidate(myCommunityProvider);
          await ref.read(sessionControllerProvider.notifier).refreshUser();
        },
        child: CustomScrollView(
          // Without this the gesture is dead whenever the content fits, which
          // is exactly the case on the screen a new member sees first.
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: <Widget>[
            SliverToBoxAdapter(child: _Header(user: user)),
            SliverPadding(
              // The header deliberately paints under the status bar, so this
              // screen has no `SafeArea`; the bottom inset is added back here
              // to keep the last card clear of the gesture bar.
              padding: EdgeInsets.fromLTRB(
                AppTheme.pagePadding,
                20,
                AppTheme.pagePadding,
                32 + MediaQuery.paddingOf(context).bottom,
              ),
              sliver: SliverList.list(
                children: <Widget>[
                  if (hasCommunity) ...<Widget>[
                    Entrance.staggered(index: 0, child: const _CommunityCard()),
                    const SizedBox(height: AppTheme.gutter),
                    Entrance.staggered(index: 1, child: const _QuickActions()),
                    const SizedBox(height: 28),
                    Entrance.staggered(
                      index: 2,
                      child: const _FeatureGrid(isMember: true),
                    ),
                  ] else ...<Widget>[
                    Entrance.staggered(index: 0, child: const _JoinCard()),
                    const SizedBox(height: 28),
                    Entrance.staggered(
                      index: 1,
                      child: const _FeatureGrid(isMember: false),
                    ),
                  ],
                  if (!user.isProfileComplete) ...<Widget>[
                    const SizedBox(height: 28),
                    Entrance.staggered(index: 3, child: const _ProfilePrompt()),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Header ───────────────────────────────────────────────────────────────────

/// The masthead: who you are, and the way into the sidebar.
///
/// A gradient band rather than an `AppBar` because the greeting, the name and
/// the role badge are the content here, not a title bar over content. It scrolls
/// away with the page — a pinned bar would spend permanent height on
/// information that does not change while you read.
class _Header extends StatelessWidget {
  const _Header({required this.user});

  final AppUser user;

  /// A greeting the member would actually use at that hour.
  ///
  /// Cheap warmth that costs no API call and cannot be wrong the way an
  /// invented statistic can. The boundaries are the conversational ones, not
  /// even six-hour blocks: नमस्ते covers the middle of the day, when neither
  /// प्रभात nor संध्या fits.
  static String greetingFor(DateTime now) {
    final int hour = now.hour;
    if (hour < 12) return 'शुभ प्रभात';
    if (hour < 16) return 'नमस्ते';
    if (hour < 20) return 'शुभ संध्या';
    return 'शुभ रात्रि';
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      // The band is dark in both themes, so the status bar icons above it have
      // to be light — including in the light theme, where the rest of the app
      // asks for dark ones.
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.fromLTRB(
          AppTheme.pagePadding,
          MediaQuery.paddingOf(context).top + 8,
          AppTheme.pagePadding,
          28,
        ),
        decoration: const BoxDecoration(
          gradient: AppSurfaces.brand,
          borderRadius: BorderRadius.vertical(
            bottom: Radius.circular(AppTheme.radiusXl),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                const _MenuButton(),
                const Spacer(),
                _Pill(label: user.role.label),
              ],
            ),
            const SizedBox(height: 18),
            Row(
              children: <Widget>[
                AppAvatar(initials: user.initials, seed: user.id, size: 52),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        greetingFor(DateTime.now()),
                        style: theme.textTheme.p.copyWith(
                          fontSize: 14,
                          height: AppTheme.devanagariLineHeight,
                          color: AppPalette.white.withValues(alpha: 0.85),
                        ),
                      ),
                      Text(
                        user.displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.h3.copyWith(
                          height: AppTheme.devanagariLineHeight,
                          color: AppPalette.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Opens the sidebar.
///
/// Its own widget so that `Scaffold.of` is called from a context *below* the
/// `Scaffold` — calling it from the screen's own build method finds no scaffold
/// and throws.
class _MenuButton extends StatelessWidget {
  const _MenuButton();

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: Scaffold.of(context).openDrawer,
      tooltip: 'मेनू',
      icon: const Icon(Icons.menu_rounded, color: AppPalette.white, size: 26),
      style: IconButton.styleFrom(
        backgroundColor: AppPalette.white.withValues(alpha: 0.16),
        // Material's default is 48dp; the app's own minimum is 52.
        minimumSize: const Size(AppTheme.minTapTarget, AppTheme.minTapTarget),
        padding: EdgeInsets.zero,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppTheme.radiusSm)),
        ),
      ),
    );
  }
}

/// A chip that reads on the brand gradient. See the sidebar's copy of this for
/// why `ShadBadge` is not used on a gradient.
class _Pill extends StatelessWidget {
  const _Pill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppPalette.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.muted.copyWith(
          fontSize: 12,
          height: 1.2,
          fontWeight: FontWeight.w600,
          color: AppPalette.white,
        ),
      ),
    );
  }
}

// ── The community a member belongs to ────────────────────────────────────────

/// The community card, from live data.
///
/// The three states are deliberately *not* three different-looking screens.
/// Loading is the card's own silhouette, and a failure falls back to the plain
/// photo banner rather than an error box: this is the first thing a member sees
/// on opening the app, and a red error at the top of it — for a card that is
/// decorative until they tap it — reads as "the app is broken", not "one
/// request timed out". The real error, with a retry, lives on the community
/// screen this card opens.
class _CommunityCard extends ConsumerWidget {
  const _CommunityCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(myCommunityProvider).when(
          data: (Community? community) => community == null
              ? const _CommunityBanner()
              : _CommunityCardBody(community: community),
          loading: () => const _CommunityCardSkeleton(),
          error: (_, _) => const _CommunityBanner(),
        );
  }
}

class _CommunityCardBody extends StatelessWidget {
  const _CommunityCardBody({required this.community});

  final Community community;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final String? place = community.placeLabel;

    return AppTappable(
      onTap: () => context.push(AppRoutes.myCommunity),
      borderRadius: AppTheme.radiusLg,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: theme.colorScheme.card,
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          border: Border.all(color: theme.colorScheme.border),
          boxShadow: AppSurfaces.lift(theme.brightness),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            SizedBox(
              height: 116,
              child: Stack(
                fit: StackFit.expand,
                children: <Widget>[
                  const AppNetworkImage(image: AppImages.communityBanner),
                  const DecoratedBox(
                    decoration: BoxDecoration(gradient: AppSurfaces.imageScrim),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    child: Align(
                      alignment: Alignment.bottomLeft,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            community.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.h4.copyWith(
                              height: AppTheme.devanagariLineHeight,
                              color: AppPalette.white,
                            ),
                          ),
                          if (place != null)
                            Text(
                              place,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.muted.copyWith(
                                fontSize: 13,
                                height: AppTheme.devanagariLineHeight,
                                color:
                                    AppPalette.white.withValues(alpha: 0.85),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: <Widget>[
                        // Real numbers, from `/communities/mine`. Nothing here
                        // is computed or estimated on the client.
                        _Fact(
                          icon: Icons.people_alt_rounded,
                          label: '${community.memberCount} सदस्य',
                        ),
                        _Fact(
                          icon: Icons.category_rounded,
                          label: community.type.label,
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.chevron_right_rounded,
                    color: theme.colorScheme.mutedForeground,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 14, color: theme.colorScheme.mutedForeground),
          const SizedBox(width: 6),
          Text(
            label,
            style: theme.textTheme.muted.copyWith(
              fontSize: 12,
              height: 1.3,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// The card's own silhouette while the request is in flight.
///
/// Static blocks rather than a shimmer sweep. A shimmer is an animation that
/// runs for as long as the network is slow, which on the target device means it
/// runs longest exactly where the GPU has least to spare.
class _CommunityCardSkeleton extends StatelessWidget {
  const _CommunityCardSkeleton();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    Widget block(double width, double height) => Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            color: theme.colorScheme.muted,
            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          ),
        );

    return ExcludeSemantics(
      child: Container(
        // The body's image band plus its fact row, so the card does not change
        // height when the data lands and shove the page under the reader.
        height: 174,
        decoration: BoxDecoration(
          color: theme.colorScheme.card,
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          border: Border.all(color: theme.colorScheme.border),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[
            block(160, 20),
            block(110, 14),
            block(200, 24),
          ],
        ),
      ),
    );
  }
}

/// The fallback masthead: a photograph and nothing that could be wrong.
///
/// Shown when the community request fails, or when the server says the member
/// belongs to nothing while their own record still says otherwise.
class _CommunityBanner extends StatelessWidget {
  const _CommunityBanner();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return AppTappable(
      onTap: () => context.push(AppRoutes.myCommunity),
      borderRadius: AppTheme.radiusLg,
      child: AppHeroImage(
        image: AppImages.communityBanner,
        aspectRatio: 21 / 9,
        overlay: Text(
          'आपका समुदाय',
          style: theme.textTheme.h4.copyWith(
            height: AppTheme.devanagariLineHeight,
            color: AppPalette.white,
          ),
        ),
      ),
    );
  }
}

// ── Quick actions ────────────────────────────────────────────────────────────

/// The three places a member actually goes.
///
/// They duplicate three sidebar entries on purpose. The sidebar is for finding
/// something; this row is for the thing you opened the app to do, and one tap
/// beats two whenever the answer is the same every time.
class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: <Widget>[
        Expanded(
          child: _QuickAction(
            icon: Icons.event_rounded,
            label: 'कार्यक्रम',
            route: AppRoutes.communityEvents,
          ),
        ),
        SizedBox(width: 10),
        Expanded(
          child: _QuickAction(
            icon: Icons.groups_rounded,
            label: 'समुदाय',
            route: AppRoutes.myCommunity,
          ),
        ),
        SizedBox(width: 10),
        Expanded(
          child: _QuickAction(
            icon: Icons.person_rounded,
            label: 'मेरा खाता',
            route: AppRoutes.profile,
          ),
        ),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.route,
  });

  final IconData icon;
  final String label;
  final String route;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return AppTappable(
      onTap: () => context.push(route),
      borderRadius: AppTheme.radiusMd,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
        decoration: BoxDecoration(
          color: theme.colorScheme.card,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          border: Border.all(color: theme.colorScheme.border),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              height: 42,
              width: 42,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: theme.colorScheme.accent,
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
              ),
              child: Icon(
                icon,
                size: 22,
                color: theme.colorScheme.accentForeground,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: theme.textTheme.small.copyWith(
                fontSize: 13,
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── The call to action for a member with no community ────────────────────────

/// Written as an invitation rather than a warning: someone who just installed
/// the app has done nothing wrong, and a red "action required" banner reads as
/// an error to a user who is already unsure of themselves.
class _JoinCard extends StatelessWidget {
  const _JoinCard();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        gradient: AppSurfaces.brand,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppSurfaces.lift(theme.brightness),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          // Sits above the copy rather than behind it. A photograph behind
          // Devanagari body text needs a scrim heavy enough that the photo
          // stops being worth showing; giving it its own band keeps both
          // legible.
          const SizedBox(
            height: 132,
            width: double.infinity,
            child: AppNetworkImage(
              image: AppImages.joinCommunity,
              fallbackTone: IllustrationTone.onBrand,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'अपने समुदाय से जुड़ें',
                  style: theme.textTheme.h4.copyWith(
                    height: AppTheme.devanagariLineHeight,
                    color: AppPalette.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'नेता से मिला कोड डालें, या उनके भेजे लिंक को दबाएँ।',
                  style: theme.textTheme.p.copyWith(
                    height: AppTheme.devanagariLineHeight,
                    color: AppPalette.white.withValues(alpha: 0.85),
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: AppTheme.minTapTarget,
                  child: ShadButton.secondary(
                    onPressed: () => context.push(AppRoutes.joinCommunity),
                    child: const Text(
                      'कोड डालें',
                      style: TextStyle(fontSize: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── What the community gets you ──────────────────────────────────────────────

/// A short, honest preview of the feature set.
///
/// Four entries, not seven: this is a taste, and the full list already lives on
/// the community screen where a member goes to read it. The status chip on each
/// tile comes from [CommunityFeature] itself, so nothing here can claim a
/// feature works — see the module's honesty rules.
///
/// A grid rather than a horizontal carousel. Content hidden off the right edge
/// is content this audience does not find, and four tiles cost less height than
/// the "swipe for more" affordance a carousel would need to earn its place.
class _FeatureGrid extends StatelessWidget {
  const _FeatureGrid({required this.isMember});

  /// Non-members see the same tiles, unpressable. Every route behind them is
  /// guarded on membership, so making them tappable would buy a redirect.
  final bool isMember;

  static const int _shown = 4;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final List<CommunityFeature> features =
        CommunityFeature.values.take(_shown).toList(growable: false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          isMember ? 'आपके समुदाय में' : 'जुड़ने पर क्या मिलेगा',
          style: theme.textTheme.h4.copyWith(
            height: AppTheme.devanagariLineHeight,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          isMember
              ? 'ये सुविधाएँ आपके लिए बन रही हैं।'
              : 'समुदाय से जुड़ते ही ये सुविधाएँ खुलने लगेंगी।',
          style: theme.textTheme.muted.copyWith(
            height: AppTheme.devanagariLineHeight,
          ),
        ),
        const SizedBox(height: 14),
        for (int row = 0; row < features.length; row += 2)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: IntrinsicHeight(
              // Both tiles in a row match the taller one. `IntrinsicHeight`
              // adds a layout pass, which is a real cost — but over two leaf
              // tiles with no nested scrollables it is immeasurable, and the
              // alternative (a hard-coded height) clips the moment the user
              // turns up their font size, which this audience does.
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Expanded(
                    child: _FeatureTile(
                      feature: features[row],
                      isMember: isMember,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: row + 1 < features.length
                        ? _FeatureTile(
                            feature: features[row + 1],
                            isMember: isMember,
                          )
                        // An odd-length list leaves a hole rather than a
                        // stretched tile pretending to be a different size.
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
          ),
        if (isMember)
          Align(
            alignment: Alignment.centerLeft,
            child: ShadButton.ghost(
              onPressed: () => context.push(AppRoutes.myCommunity),
              child: const Text('सभी सुविधाएँ देखें'),
            ),
          ),
      ],
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({required this.feature, required this.isMember});

  final CommunityFeature feature;
  final bool isMember;

  /// Where the tile goes. The events preview has a screen of its own; every
  /// other feature shares the generic "here is what this will do" screen.
  String get _route => feature == CommunityFeature.events
      ? AppRoutes.communityEvents
      : AppRoutes.communityFeature(feature.slug);

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final String? status = feature.statusLabel;

    return AppTappable(
      onTap: isMember ? () => context.push(_route) : null,
      borderRadius: AppTheme.radiusMd,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: theme.colorScheme.card,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          border: Border.all(color: theme.colorScheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(
                  feature.icon,
                  size: 24,
                  color: theme.colorScheme.foreground,
                ),
                if (status != null) _StatusChip(label: status),
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

// ── Profile ──────────────────────────────────────────────────────────────────

/// Shown only while the profile is incomplete.
///
/// This replaced a card that listed the member's phone, role and profile status
/// on every visit. That card restated what the header already says and what the
/// account screen says better, and it was unactionable — the useful half is the
/// one case where there is something to do, and that is this.
class _ProfilePrompt extends StatelessWidget {
  const _ProfilePrompt();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AppSurfaces.warm(theme.brightness),
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        border: Border.all(color: theme.colorScheme.border),
      ),
      child: Row(
        children: <Widget>[
          Icon(
            Icons.badge_rounded,
            size: 26,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'प्रोफ़ाइल पूरी करें',
                  style: theme.textTheme.large.copyWith(
                    height: AppTheme.devanagariLineHeight,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'अपना नाम जोड़ें ताकि समुदाय के लोग आपको पहचान सकें।',
                  style: theme.textTheme.muted.copyWith(
                    height: AppTheme.devanagariLineHeight,
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: AppTheme.minTapTarget,
                  child: ShadButton(
                    onPressed: () => context.push(AppRoutes.profile),
                    child: const Text(
                      'प्रोफ़ाइल खोलें',
                      style: TextStyle(fontSize: 15),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
