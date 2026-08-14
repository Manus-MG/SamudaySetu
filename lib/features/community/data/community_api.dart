import '../../../core/network/api_client.dart';
import '../../auth/domain/app_user.dart';
import '../domain/community.dart';
import '../domain/invite.dart';
import '../domain/join_kit.dart';

/// Thin, typed wrappers over `/api/v1/communities`.
///
/// Every method returns a parsed domain object or throws an `ApiFailure`. No
/// screen ever sees a `Map`.
///
/// The leader-facing half mirrors what the web console can do, because a leader
/// has no account on the web console at all — they sign in here, by phone and
/// OTP, and this is the only place they can run their community from.
class CommunityApi {
  const CommunityApi(this._client);

  final ApiClient _client;

  // ── Joining, for members ───────────────────────────────────────────────────

  /// Resolves a code to a community *without* joining.
  ///
  /// The separate preview step is the most important part of this flow. Someone
  /// who mistypes a letter and silently lands in a stranger's community has no
  /// way to understand what happened; someone shown a name and asked "is this
  /// yours?" catches it at once. It is also what makes the server's
  /// hyphen-insensitive matching safe to be generous.
  Future<CommunityPreview> previewByCode(String code) async {
    final data = await _client.get('/communities/lookup/${Uri.encodeComponent(code)}');
    return CommunityPreview.fromJson(data);
  }

  Future<Community> joinByCode(String code) async {
    final data = await _client.post('/communities/join', body: <String, String>{'code': code});
    return Community.fromJson(data);
  }

  Future<InvitePreview> previewInvite(String token) async {
    final data = await _client.get('/communities/invites/${Uri.encodeComponent(token)}');
    return InvitePreview.fromJson(data);
  }

  Future<Community> acceptInvite(String token) async {
    final data = await _client.post(
      '/communities/invites/accept',
      body: <String, String>{'token': token},
    );
    return Community.fromJson(data);
  }

  Future<void> leave() async {
    await _client.post('/communities/leave');
  }

  /// The signed-in actor's community: the one a leader runs, or the one a member
  /// joined. `null` for either when there is none.
  ///
  /// The server answers `{ community: … | null }` rather than a bare `null`, so
  /// "no community" is an ordinary success rather than a shape the transport
  /// layer has to special-case.
  Future<Community?> mine() async {
    final data = await _client.get('/communities/mine');
    final community = data['community'];
    if (community is! Map<String, dynamic>) return null;
    return Community.fromJson(community);
  }

  // ── Running a community, for leaders ───────────────────────────────────────

  /// Proposes a new community. A leader's creation lands in `PENDING_APPROVAL`
  /// and cannot recruit until staff clear it — the server decides that, not us.
  Future<Community> create({
    required String name,
    required CommunityType type,
    String? description,
    String? state,
    String? district,
    String? city,
    String? pincode,
  }) async {
    final location = <String, String>{
      if (_present(state)) 'state': state!.trim(),
      if (_present(district)) 'district': district!.trim(),
      if (_present(city)) 'city': city!.trim(),
      if (_present(pincode)) 'pincode': pincode!.trim(),
    };

    final data = await _client.post('/communities', body: <String, Object>{
      'name': name.trim(),
      'type': type.wire,
      // Empty optional fields are omitted rather than sent as `''`: the server's
      // schema is strict, and an empty string is not a valid PIN code.
      if (_present(description)) 'description': description!.trim(),
      if (location.isNotEmpty) 'location': location,
    });

    return Community.fromJson(data);
  }

  /// Partial update. Only the keys passed are sent, so a screen that edits one
  /// field cannot blank the others by omission.
  Future<Community> update(
    String id, {
    String? name,
    String? description,
    CommunityType? type,
    String? state,
    String? district,
    String? city,
    String? pincode,
    bool? isJoinable,
  }) async {
    final location = <String, String>{
      if (_present(state)) 'state': state!.trim(),
      if (_present(district)) 'district': district!.trim(),
      if (_present(city)) 'city': city!.trim(),
      if (_present(pincode)) 'pincode': pincode!.trim(),
    };

    final body = <String, Object?>{
      if (name != null) 'name': name.trim(),
      // Explicitly nullable on the server: null clears the description, absent
      // leaves it alone. An empty string means the user cleared the field.
      if (description != null) 'description': description.trim().isEmpty ? null : description.trim(),
      if (type != null) 'type': type.wire,
      if (location.isNotEmpty) 'location': location,
      if (isJoinable != null) 'isJoinable': isJoinable,
    };

    final data = await _client.patch('/communities/$id', body: body);
    return Community.fromJson(data);
  }

  /// The share bundle for whichever community the signed-in user belongs to.
  ///
  /// Distinct from [joinKit] and not a convenience wrapper around it: that one
  /// takes an id and is gated on `community:read`, which an ordinary member does
  /// not hold. This one is authorised by membership. Members pass the code on to
  /// neighbours more than leaders do, so they get the same server-composed
  /// message and QR rather than a second-class "copy the code" button.
  ///
  /// Null when the caller belongs to no community — an ordinary state with its
  /// own screen, not an error.
  Future<JoinKit?> myJoinKit() async {
    final data = await _client.get('/communities/mine/join-kit');
    final kit = data['joinKit'];
    if (kit is! Map<String, dynamic>) return null;
    return JoinKit.fromJson(kit);
  }

  Future<JoinKit> joinKit(String id) async {
    final data = await _client.get('/communities/$id/join-kit');
    return JoinKit.fromJson(data);
  }

  /// Issues a fresh two-word code. The old one stops working immediately.
  Future<JoinKit> rotateJoinCode(String id) async {
    final data = await _client.post('/communities/$id/join-code/rotate');
    return JoinKit.fromJson(data);
  }

  /// Live availability check for a custom code, called as the leader types.
  Future<JoinCodeAvailability> checkJoinCode(String id, String code) async {
    final data = await _client.get(
      '/communities/$id/join-code/check',
      query: <String, dynamic>{'code': code},
    );
    return JoinCodeAvailability.fromJson(data);
  }

  Future<JoinKit> setJoinCode(String id, String code) async {
    final data = await _client.put('/communities/$id/join-code', body: <String, String>{
      'code': code,
    });
    return JoinKit.fromJson(data);
  }

  Future<Paged<AppUser>> members(String id, {int page = 1, String? search}) async {
    final data = await _client.get('/communities/$id/members', query: <String, dynamic>{
      'page': page,
      'pageSize': 20,
      if (_present(search)) 'search': search!.trim(),
    });
    return Paged<AppUser>.fromJson(data, AppUser.fromJson);
  }

  Future<Paged<Invite>> invites(String id, {int page = 1}) async {
    final data = await _client.get('/communities/$id/invites', query: <String, dynamic>{
      'page': page,
      'pageSize': 20,
    });
    return Paged<Invite>.fromJson(data, Invite.fromJson);
  }

  Future<SentInvite> sendInvite(String id, String phone) async {
    final data = await _client.post('/communities/$id/invites', body: <String, String>{
      'phone': phone,
    });
    return SentInvite.fromJson(data);
  }

  Future<void> revokeInvite(String id, String inviteId) async {
    await _client.delete('/communities/$id/invites/$inviteId');
  }

  /// Recounts members from the member records, repairing the denormalised
  /// counter if a process died mid-join.
  Future<Community> reconcileMembers(String id) async {
    final data = await _client.post('/communities/$id/members/reconcile');
    return Community.fromJson(data);
  }
}

bool _present(String? value) => value != null && value.trim().isNotEmpty;
