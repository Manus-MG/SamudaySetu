/// Every brand-facing string in one place.
///
/// The app is a community platform, not a product with one owner: the same
/// binary is pitched to one association, then to the next. When those strings
/// live inline in a splash screen, an app bar and a manifest, re-branding means
/// finding them again by grep and missing one — and the one that gets missed is
/// always visible to the people being pitched to.
///
/// So the rule is: nothing user-visible says the client's name except through
/// this file. Everything below is copy, not configuration — the deep-link
/// scheme, package id and API host deliberately stay where they are
/// (`AppConfig`), because renaming those breaks live invite links for zero
/// visible gain.
///
/// **This branch is the timber-trade build.** The five values below are
/// placeholders standing in for the association's registered name, which is not
/// yet confirmed. Replacing them is a five-line edit here and nowhere else; the
/// native app label in `AndroidManifest.xml` and `Info.plist` is the only copy
/// of [appTitle] that lives outside this file, because the OS reads it before
/// Dart runs.
abstract final class AppBrand {
  /// The OS-level name: task switcher, share sheet, permission dialogs.
  ///
  /// Latin rather than Devanagari because it sits beside other app names in
  /// system UI that is not laid out for a 1.45 line height, and because the
  /// Play Store listing has to match it.
  static const String appTitle = 'Kashth Vyapar Setu';

  /// The wordmark, for surfaces the app owns — splash, sidebar header, hero
  /// overlays. Devanagari, because every other string a member reads is.
  static const String wordmark = 'काष्ठ व्यापार सेतु';

  /// The association on its own, for sentences that already supply the context
  /// ("संघ के बारे में") and for anywhere [wordmark] would wrap.
  static const String shortName = 'काष्ठ व्यापार संघ';

  /// One line on what the app is for. Used under the wordmark, never alone.
  static const String tagline = 'व्यापार की एक डोर, एक ऐप में';

  /// The trade's own working principle, shown as a standing line under the
  /// wordmark on the splash and the about screen.
  ///
  /// The Arkvanshi build carried a lineage motto here. A trade body has no
  /// equivalent, so this slot holds what the association actually sells to a
  /// prospective member: that dealing through it is dealing straight.
  static const String motto = 'नाप सही • माल सही • बात सही';
}
