import 'package:flutter/foundation.dart';

import '../widgets/app_illustration.dart';

/// One photograph the app knows how to show.
///
/// Carries its own fallback motif rather than leaving that to the call site.
/// That is the whole point of the type: a caller physically cannot ask for a
/// photo without also having declared what to draw when the photo is missing,
/// slow or 404. On a 2G connection "missing or slow" is the common case, not
/// the edge case, so leaving the fallback optional would mean shipping blank
/// rectangles to exactly the users this app is for.
@immutable
class AppImage {
  const AppImage._(this.photoId, this.fallback);

  /// The Unsplash photo id, e.g. `1759738101500-6d8d522b2681`. Stored bare so
  /// the size, format and crop can be chosen per call site — see [url].
  final String photoId;

  /// Drawn while the photo loads, and instead of it if it never arrives.
  final IllustrationMotif fallback;

  /// A URL for this photo, rendered by the CDN at [width] device pixels.
  ///
  /// Asking the CDN for the exact size is the single biggest data saving in the
  /// app. The same photograph is ~1.6 MB at full resolution and ~28 KB at
  /// 360px wide in WebP; on a metered 2G connection that is the difference
  /// between a screen that loads and a screen the user backs out of. Nothing
  /// here ever needs more than the pixels it paints.
  ///
  /// [width] is snapped to a bucket by the caller so that the URL — and
  /// therefore the cache entry — is stable across rotations and rebuilds.
  ///
  /// `crop=faces,entropy` matters more than it looks: these are 3:2 photographs
  /// being cropped to 16:10 and 21:9, and a centre crop routinely cuts the
  /// heads off the people who are the reason the photo was chosen.
  String url({required int width}) =>
      'https://images.unsplash.com/photo-$photoId'
      '?w=$width&q=70&fm=webp&fit=crop&crop=faces,entropy';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppImage && other.photoId == photoId;

  @override
  int get hashCode => photoId.hashCode;
}

/// Every photograph in the app, named once.
///
/// **Where they come from.** Unsplash, served from `images.unsplash.com`.
/// The Unsplash Licence permits free commercial use and hotlinking without
/// attribution; crediting photographers is optional but appreciated, and the
/// [photoId] on every entry is what you would need to look one up.
///
/// **Why hotlinked rather than bundled.** Nothing here is in the APK, so the
/// install stays small on a metered connection and the imagery can be changed
/// without shipping a release. The cost is a first paint that depends on the
/// network — which is exactly what the fallback motifs are for.
///
/// **Why a catalogue rather than URLs at the call site.** Three reasons, in
/// order of how much they will hurt later:
///
///  1. Swapping a photo, or moving the whole set to your own CDN when you have
///     photographs of real members, is one edit here.
///  2. Every entry declares its own fallback, so a dead URL degrades to a drawn
///     illustration instead of a grey box.
///  3. The set of images the app uses is legible in one file, which is what
///     anyone reviewing the app's tone needs.
///
/// **Reviewing them.** `_image-review.html` at the repository root renders every
/// candidate in a grid. Open it in a browser to see what these actually look
/// like, and swap any [photoId] you disagree with.
abstract final class AppImages {
  // ── Splash ────────────────────────────────────────────────────────────────
  /// A marigold procession — warm, crowded, unmistakably a community.
  /// Chosen for its palette as much as its subject: it is saffron-dominant, so
  /// it reads as one image with the brand veil over it rather than two.
  static const AppImage splash =
      AppImage._('1590906424086-3dbc808fd54b', IllustrationMotif.community);

  // ── Onboarding ────────────────────────────────────────────────────────────
  /// Women and children in a village — belonging.
  static const AppImage onboardingCommunity =
      AppImage._('1759738101500-6d8d522b2681', IllustrationMotif.community);

  /// Plotted fields and houses from above — the slide is about seeing the
  /// whole organisation laid out, and land divided into plots says that far
  /// more directly than a scenic valley does.
  static const AppImage onboardingStructure =
      AppImage._('1774697443203-0f54409d1613', IllustrationMotif.network);

  /// A single member, unhurried — this is about one person's number and nobody
  /// else's business.
  static const AppImage onboardingPrivacy =
      AppImage._('1724996854069-a7d335193ee2', IllustrationMotif.shield);

  // ── Home ──────────────────────────────────────────────────────────────────
  /// Village women, seated and looking straight out. On a "join us" card the
  /// photograph has to be an invitation; a dim room of strangers is not one.
  static const AppImage joinCommunity =
      AppImage._('1723564211731-21ceb97443a5', IllustrationMotif.community);

  /// The masthead for a member who already belongs.
  static const AppImage communityBanner =
      AppImage._('1774615600073-5e04e3082108', IllustrationMotif.gathering);

  // ── Auth ──────────────────────────────────────────────────────────────────
  static const AppImage signIn =
      AppImage._('1601689892697-b64daa00ff6d', IllustrationMotif.community);

  // ── Community ─────────────────────────────────────────────────────────────
  static const AppImage inviteKit =
      AppImage._('1747144930206-fe1011a017e4', IllustrationMotif.invite);

  // ── Events, by kind ───────────────────────────────────────────────────────
  static const AppImage _eventMeeting =
      AppImage._('1592820186056-dc600b8ddff4', IllustrationMotif.gathering);
  static const AppImage _eventFestival =
      AppImage._('1774437557008-6f33efdd0332', IllustrationMotif.gathering);
  static const AppImage _eventCamp =
      AppImage._('1708593343442-7595427ddf7b', IllustrationMotif.gathering);
  static const AppImage _eventDrive =
      AppImage._('1776507178418-b9b689a1ad73', IllustrationMotif.gathering);
  static const AppImage _eventTraining =
      AppImage._('1692269725836-fbd72e98883f', IllustrationMotif.gathering);

  /// Cover art for an event, keyed by `EventKind.name`.
  ///
  /// Keyed by name rather than by importing the enum so that `core/` keeps
  /// knowing nothing about `features/`. A kind with no entry falls back to the
  /// meeting cover, which is a finished-looking screen rather than a gap — so
  /// adding an `EventKind` cannot break this file.
  static AppImage eventCover(String kindName) => switch (kindName) {
        'festival' => _eventFestival,
        'camp' => _eventCamp,
        'drive' => _eventDrive,
        'training' => _eventTraining,
        _ => _eventMeeting,
      };
}
