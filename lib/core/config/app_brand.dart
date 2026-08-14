/// Every brand-facing string in one place.
///
/// The app is a community platform, not a product with one owner: the same
/// binary is pitched to one samaj, then to the next. When those strings live
/// inline in a splash screen, an app bar and a manifest, re-branding means
/// finding them again by grep and missing one — and the one that gets missed is
/// always visible to the people being pitched to.
///
/// So the rule is: nothing user-visible says the samaj's name except through
/// this file. Everything below is copy, not configuration — the deep-link
/// scheme, package id and API host deliberately stay where they are
/// (`AppConfig`), because renaming those breaks live invite links for zero
/// visible gain.
abstract final class AppBrand {
  /// The OS-level name: task switcher, share sheet, permission dialogs.
  ///
  /// Latin rather than Devanagari because it sits beside other app names in
  /// system UI that is not laid out for a 1.45 line height, and because the
  /// Play Store listing has to match it.
  static const String appTitle = 'Arkvanshi Samaj Setu';

  /// The wordmark, for surfaces the app owns — splash, sidebar header, hero
  /// overlays. Devanagari, because every other string a member reads is.
  static const String wordmark = 'अर्कवंशी समाज सेतु';

  /// The samaj on its own, for sentences that already supply the context
  /// ("अर्कवंशी समाज के बारे में") and for anywhere [wordmark] would wrap.
  static const String shortName = 'अर्कवंशी समाज';

  /// One line on what the app is for. Used under the wordmark, never alone.
  static const String tagline = 'सूर्यवंश की एक डोर, एक ऐप में';

  /// The lineage's own phrase, in circulation in the community's own writing.
  /// It appears as a quotation, so it is never edited to fit a layout — if it
  /// does not fit, the layout changes.
  static const String motto = 'अर्ककुल शिरोमणि श्री राम';
}
