import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../media/app_images.dart';
import '../theme/app_theme.dart';
import '../theme/motion.dart';
import 'app_illustration.dart';

/// A photograph from the CDN, with the guarantees this audience needs.
///
/// Five things it does that a bare `Image.network` does not, each of which is a
/// real defect on the target device rather than a nicety:
///
///  1. **Never blank.** The [AppImage]'s own illustration paints immediately
///     and stays until the photo has actually decoded. On 2G that is often the
///     whole session, and an illustrated card is a finished screen while a grey
///     rectangle with a spinner is a broken one.
///  2. **Fetches only the pixels it paints.** The requested width comes from
///     the real layout, not from a constant, and is sent to the CDN — so a card
///     360px wide downloads a 360px image, not a 1.6 MB original.
///  3. **Bounded memory.** Decode is capped by `memCacheWidth` as well. A
///     1080px hero decoded for a 360dp phone holds ~4x the bitmap it needs, and
///     four of those is an OOM on a 2 GB device.
///  4. **Persistent disk cache.** `cached_network_image` keeps the file across
///     launches. Re-downloading the same hero on every cold start is the
///     difference between an app that costs data and one that does not.
///  5. **Failure is not an error state.** A 404, a DNS failure or an airplane-
///     mode launch all resolve to the same illustration. The user is never
///     shown a broken-image glyph for something that was decorative anyway.
///
/// Decorative by contract, so it carries no semantics — callers put the meaning
/// in the text beside it.
class AppNetworkImage extends StatelessWidget {
  const AppNetworkImage({
    required this.image,
    this.fit = BoxFit.cover,
    this.fallbackTone = IllustrationTone.soft,
    super.key,
  }) : _bare = false;

  /// For a photograph stacked over a surface that already looks finished — a
  /// brand gradient, a filled card.
  ///
  /// Paints nothing at all while loading and nothing on failure, so the layer
  /// underneath shows through untouched. The normal constructor's illustration
  /// would cover that surface with a second, competing one.
  const AppNetworkImage.overlay({
    required this.image,
    this.fit = BoxFit.cover,
    super.key,
  })  : fallbackTone = IllustrationTone.quiet,
        _bare = true;

  final AppImage image;
  final BoxFit fit;

  /// How the fallback illustration is coloured. [IllustrationTone.onBrand] when
  /// this sits on the brand gradient, [IllustrationTone.soft] on a page.
  final IllustrationTone fallbackTone;

  /// True for [AppNetworkImage.overlay]: draw the photo or nothing.
  final bool _bare;

  /// The widths the CDN is ever asked for, smallest first.
  ///
  /// Snapping to a bucket rather than passing the measured width verbatim is
  /// what makes the cache useful: an unrounded width produces a new URL — and
  /// so a fresh download — after a rotation, a keyboard opening, or any layout
  /// that lands a pixel off. Six buckets cover every real Android density from
  /// a 480x854 budget phone to a 1440p flagship.
  static const List<int> _widthBuckets = <int>[240, 360, 480, 640, 828, 1080];

  static int _bucketFor(double devicePixels) {
    for (final int bucket in _widthBuckets) {
      if (devicePixels <= bucket) return bucket;
    }
    return _widthBuckets.last;
  }

  @override
  Widget build(BuildContext context) {
    // The illustration also serves as the placeholder, so the frame the photo
    // fades into is never empty and never shifts.
    final Widget placeholder = _bare
        ? const SizedBox.shrink()
        : AppIllustration(motif: image.fallback, tone: IllustrationTone.quiet);
    final Widget fallback = _bare
        ? const SizedBox.shrink()
        : AppIllustration(motif: image.fallback, tone: fallbackTone);

    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final double dpr = MediaQuery.devicePixelRatioOf(context);
        final double logicalWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : MediaQuery.sizeOf(context).width;
        final int width = _bucketFor(logicalWidth * dpr);

        return CachedNetworkImage(
          imageUrl: image.url(width: width),
          // Explicit, so that changing the URL's query parameters later — a
          // different quality, a different crop — does not silently orphan
          // every file already on disk.
          cacheKey: '${image.photoId}@$width',
          fit: fit,
          memCacheWidth: width,
          maxWidthDiskCache: width,
          fadeInDuration: Motion.normal,
          fadeInCurve: Motion.enter,
          fadeOutDuration: Motion.fast,
          // The placeholder must be on screen in the first frame; fading it in
          // would show a flash of background first.
          placeholderFadeInDuration: Duration.zero,
          placeholder: (BuildContext context, String url) => placeholder,
          errorWidget: (BuildContext context, String url, Object error) =>
              fallback,
        );
      },
    );
  }
}

/// A full-width image with rounded corners, a legibility scrim and content laid
/// over it.
///
/// Exists so that "the hero at the top of a screen" is one definition. Hand-
/// rolled per screen, the corner radius, the aspect ratio and — worst — the
/// scrim opacity drift apart, and the screen whose scrim is a little too light
/// is the one where the caption becomes unreadable over a bright photo.
class AppHeroImage extends StatelessWidget {
  const AppHeroImage({
    required this.image,
    this.overlay,
    this.aspectRatio = AppTheme.heroAspectRatio,
    this.borderRadius = AppTheme.radiusLg,
    this.padding = const EdgeInsets.all(20),
    super.key,
  });

  final AppImage image;

  /// Laid over the scrim, bottom-aligned. Text here should be light-on-dark:
  /// the scrim guarantees a dark backdrop, whatever the photo is.
  final Widget? overlay;

  final double aspectRatio;
  final double borderRadius;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: AspectRatio(
        aspectRatio: aspectRatio,
        child: DecoratedBox(
          // Painted under the image so the corners are never transparent while
          // the photo is still arriving.
          decoration: BoxDecoration(color: theme.colorScheme.muted),
          child: Stack(
            fit: StackFit.expand,
            children: <Widget>[
              AppNetworkImage(image: image),
              if (overlay != null) ...<Widget>[
                const DecoratedBox(
                  decoration: BoxDecoration(gradient: AppSurfaces.imageScrim),
                ),
                Padding(
                  padding: padding,
                  child: Align(
                    alignment: Alignment.bottomLeft,
                    child: overlay,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
