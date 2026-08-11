import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../auth/application/session_controller.dart';
import '../../auth/domain/app_user.dart';
import '../domain/community.dart';
import '../domain/invite.dart';
import '../domain/join_kit.dart';

/// Riverpod wiring for the community feature.
///
/// Everything here is a `FutureProvider` rather than a hand-rolled controller
/// with loading/error booleans. Two reasons: `AsyncValue` already models the
/// three states a screen has to render, and `ref.invalidate` after a mutation is
/// a one-liner where a controller would need a refresh method per screen.

/// The signed-in actor's community — the one a leader runs or a member joined.
///
/// `null` is a legitimate value, not an error: a fresh member has not joined
/// anything and a leader may not have proposed anything yet. Both are ordinary
/// states with their own screens.
///
/// Keyed on the user id so signing in as somebody else cannot serve the previous
/// account's community from cache.
final myCommunityProvider = FutureProvider.autoDispose<Community?>((ref) async {
  final userId = ref.watch(sessionControllerProvider.select((state) => state.user?.id));
  if (userId == null) return null;

  return ref.watch(communityApiProvider).mine();
});

/// The share kit for a community. Never cached across a rotation, because a
/// stale QR points at a code that has been deliberately killed.
final joinKitProvider =
    FutureProvider.autoDispose.family<JoinKit, String>((ref, communityId) async {
  return ref.watch(communityApiProvider).joinKit(communityId);
});

/// Arguments for a paged, searchable member list.
///
/// A record rather than a class so Riverpod's family equality works without a
/// hand-written `==` — two identical queries share one cache entry, which is what
/// stops a rebuild from refetching page 1 on every keystroke.
typedef MemberQuery = ({String communityId, int page, String search});

final communityMembersProvider =
    FutureProvider.autoDispose.family<Paged<AppUser>, MemberQuery>((ref, query) async {
  return ref.watch(communityApiProvider).members(
        query.communityId,
        page: query.page,
        search: query.search.isEmpty ? null : query.search,
      );
});

final communityInvitesProvider =
    FutureProvider.autoDispose.family<Paged<Invite>, String>((ref, communityId) async {
  return ref.watch(communityApiProvider).invites(communityId);
});

/// Invalidates everything derived from one community.
///
/// Called after any mutation. Deliberately blunt: these lists are small, the
/// screens are not open simultaneously, and a surgical invalidation that misses
/// one provider shows the user stale data — which is a worse bug than one extra
/// request on a screen nobody is looking at.
void invalidateCommunity(Ref ref) {
  ref.invalidate(myCommunityProvider);
  ref.invalidate(joinKitProvider);
  ref.invalidate(communityMembersProvider);
  ref.invalidate(communityInvitesProvider);
}

/// The same, from a widget. `WidgetRef` and `Ref` do not share a supertype that
/// exposes `invalidate`, so this small duplication is unavoidable.
void invalidateCommunityFrom(WidgetRef ref) {
  ref.invalidate(myCommunityProvider);
  ref.invalidate(joinKitProvider);
  ref.invalidate(communityMembersProvider);
  ref.invalidate(communityInvitesProvider);
}
