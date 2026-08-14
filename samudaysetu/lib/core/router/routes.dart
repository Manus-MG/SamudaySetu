/// Every route path in one place, so deep links and redirects cannot drift.
abstract final class AppRoutes {
  static const String splash = '/';
  static const String onboarding = '/onboarding';
  static const String phone = '/login';
  static const String otp = '/login/otp';

  /// Where an ordinary member lands.
  static const String home = '/home';

  /// The account screen, shared by members and leaders.
  static const String profile = '/profile';

  // ── Joining a community ────────────────────────────────────────────────────

  /// Enter a code by hand. Also the target of a `/join/<code>` deep link, which
  /// arrives with the code prefilled.
  static const String joinCommunity = '/join';

  /// The "is this your community?" step. Reached only with a resolved preview.
  static const String joinConfirm = '/join/confirm';

  /// Success. Terminal — the flow is replaced, never pushed onto.
  static const String joined = '/join/done';

  /// A tapped invite link: `/invite/<token>`. The zero-typing path.
  static const String invite = '/invite';

  /// A member's view of the community they belong to.
  static const String myCommunity = '/community';

  // ── What membership gets you ───────────────────────────────────────────────
  //
  // Nested under [myCommunity] on purpose. These screens only make sense to
  // somebody who belongs somewhere, and the nesting means the router can guard
  // the whole subtree with one prefix check instead of one rule per screen.

  /// The events list. Sample content until the events API exists.
  static const String communityEvents = '$myCommunity/events';

  /// The parent segment for an unbuilt feature's "coming soon" screen. Never
  /// navigated to bare — always via [communityFeature].
  static const String communityFeatures = '$myCommunity/feature';

  /// One sample event: `/community/events/<id>`.
  static String communityEvent(String id) => '$communityEvents/$id';

  /// One feature's preview: `/community/feature/<slug>`. The slug is
  /// `CommunityFeature.slug`, which is why that field is ASCII and stable.
  static String communityFeature(String slug) => '$communityFeatures/$slug';

  // ── Running a community ────────────────────────────────────────────────────
  //
  // A leader has no account on the web console — they sign in to this app by
  // phone and OTP like any member — so these screens are the whole of their
  // administrative surface.

  static const String leader = '/leader';
  static const String leaderCreate = '/leader/create';
  static const String leaderEdit = '/leader/edit';
  static const String leaderShare = '/leader/share';
  static const String leaderMembers = '/leader/members';
  static const String leaderInvites = '/leader/invites';

  /// Builds the in-app path for a scanned or deep-linked join code.
  static String joinWithCode(String code) => '$joinCommunity/$code';

  /// Builds the in-app path for an invite token.
  static String inviteWithToken(String token) => '$invite/$token';
}
