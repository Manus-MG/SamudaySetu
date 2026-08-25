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
///
/// **Licence.** Every id below resolves on `images.unsplash.com` under the
/// standard Unsplash licence, and each was checked to return 200 with this
/// file's exact query string. Unsplash+ photos live on `plus.unsplash.com`
/// under a `premium_photo-` prefix and are deliberately excluded — they look
/// identical in a search grid and are not free to hotlink into a client's app.
abstract final class AppImages {
  // ── Splash ────────────────────────────────────────────────────────────────
  /// Stacked logs, end-on. Chosen for its palette as much as its subject: it is
  /// teak-dominant, so it reads as one image with the brand veil over it rather
  /// than two.
  static const AppImage splash =
      AppImage._('1721762775413-18e5faebc605', IllustrationMotif.community);

  // ── Onboarding ────────────────────────────────────────────────────────────
  /// People around a mill mechanism — the trade, with the people in it. A slide
  /// about belonging needs faces; a slide about belonging *to this trade* needs
  /// faces next to timber.
  static const AppImage onboardingCommunity =
      AppImage._('1749572859447-2219732a3660', IllustrationMotif.community);

  /// A timber yard from above, sorted into rows. The slide is about seeing the
  /// whole organisation laid out, and a yard stacked by grade says that more
  /// directly than a scenic forest does.
  static const AppImage onboardingStructure =
      AppImage._('1473023914974-0d98f0798b51', IllustrationMotif.network);

  /// A single trader at his own desk — this is about one person's number and
  /// nobody else's business.
  static const AppImage onboardingPrivacy =
      AppImage._('1771244678811-50c22f17c791', IllustrationMotif.shield);

  // ── Home ──────────────────────────────────────────────────────────────────
  /// A group in a meeting room, looking straight out. On a "join us" card the
  /// photograph has to be an invitation; a dim yard of stacked planks is not
  /// one, however on-brand it looks elsewhere.
  static const AppImage joinCommunity =
      AppImage._('1776248783518-400b6d0da64c', IllustrationMotif.community);

  /// The masthead for a member who already belongs. Rough-cut planks with the
  /// bark still on — the material before it is anyone's product.
  static const AppImage communityBanner =
      AppImage._('1667689815944-9f72c0f59e74', IllustrationMotif.gathering);

  // ── About the association ─────────────────────────────────────────────────
  /// The masthead on `संघ परिचय`.
  ///
  /// **This is the slot to replace before the association sees the app.** A
  /// lumber merchant's building is the right register, but it is a stock
  /// building in another country on a screen whose entire subject is *this*
  /// association. One photograph of the association's own premises, or of its
  /// annual meeting, does more for this screen than anything else on it.
  /// Swapping it is one photo id here, or a URL change in [AppImage.url] if the
  /// photo lives elsewhere.
  static const AppImage samajHeritage =
      AppImage._('1533657792955-7f5783c5d182', IllustrationMotif.gathering);

  // ── Auth ──────────────────────────────────────────────────────────────────
  static const AppImage signIn =
      AppImage._('1631325077010-5362410f3a64', IllustrationMotif.community);

  // ── Community ─────────────────────────────────────────────────────────────
  static const AppImage inviteKit =
      AppImage._('1783779858962-5ec92319583c', IllustrationMotif.invite);

  // ── Events, by kind ───────────────────────────────────────────────────────
  /// A committee around a table — the monthly sitting.
  static const AppImage _eventMeeting =
      AppImage._('1565946606128-949cfcbebd3e', IllustrationMotif.gathering);

  /// The annual convention. The kind is still named `festival` because that is
  /// a backend enum value shared with every client of this platform; only the
  /// picture and the copy change per association.
  static const AppImage _eventFestival =
      AppImage._('1634672652995-ee7525bce595', IllustrationMotif.gathering);

  /// Loading and haulage — the setting for a measurement or inspection camp.
  static const AppImage _eventCamp =
      AppImage._('1634388848326-62e14242c974', IllustrationMotif.gathering);

  static const AppImage _eventDrive =
      AppImage._('1749572859224-49be3cb3e109', IllustrationMotif.gathering);

  /// A log going through the saw — training is hands on the material, not
  /// slides.
  static const AppImage _eventTraining =
      AppImage._('1749572855201-feb5cf658479', IllustrationMotif.gathering);

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
