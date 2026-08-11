/// Mirrors the community DTOs in
/// `backend/src/modules/communities/communities.types.ts`.
///
/// Hand-written rather than generated, same rule as everywhere else: nothing here
/// may describe a field the API does not actually return.
library;

enum CommunityType {
  samaj('SAMAJ', 'समाज'),
  political('POLITICAL', 'राजनीतिक संगठन'),
  rwa('RWA', 'निवासी संघ'),
  alumni('ALUMNI', 'पूर्व छात्र समूह'),
  ngo('NGO', 'संस्था'),
  tradeBody('TRADE_BODY', 'व्यापार संघ'),
  other('OTHER', 'समुदाय');

  const CommunityType(this.wire, this.label);

  final String wire;

  /// Hindi, because it is shown to members and the app is Hindi-first.
  final String label;

  static CommunityType fromWire(String? value) => values.firstWhere(
        (type) => type.wire == value,
        orElse: () => CommunityType.other,
      );
}

/// Why a community that exists still cannot be joined.
///
/// The distinction earns its place: "wrong code" sends someone back to retype
/// something that was already correct, whereas "this community has paused
/// joining" tells them to call their leader. Same HTTP status, completely
/// different next action.
enum JoinBlockReason {
  notFound('NOT_FOUND'),
  notApproved('NOT_APPROVED'),
  suspended('SUSPENDED'),
  closed('CLOSED');

  const JoinBlockReason(this.wire);

  final String wire;

  static JoinBlockReason? fromWire(String? value) {
    if (value == null) return null;
    for (final reason in values) {
      if (reason.wire == value) return reason;
    }
    return null;
  }

  /// What the member is told, and what they can do about it.
  String get message => switch (this) {
        JoinBlockReason.notFound => 'यह कोड किसी समुदाय से नहीं मिला।',
        JoinBlockReason.notApproved =>
          'यह समुदाय अभी मंज़ूरी की प्रतीक्षा में है। कुछ दिन बाद प्रयास करें।',
        JoinBlockReason.suspended => 'यह समुदाय अभी बंद है। अपने नेता से संपर्क करें।',
        JoinBlockReason.closed =>
          'यह समुदाय अभी नए सदस्य नहीं ले रहा। अपने नेता से संपर्क करें।',
      };
}


/// The community lifecycle, as the server defines it.
///
/// A leader sees this directly: a community they proposed sits in
/// `pendingApproval` and cannot recruit until staff clear it, and saying so
/// plainly is the difference between "the app is broken" and "we are waiting".
enum CommunityStatus {
  pendingApproval('PENDING_APPROVAL'),
  active('ACTIVE'),
  rejected('REJECTED'),
  suspended('SUSPENDED'),
  archived('ARCHIVED');

  const CommunityStatus(this.wire);

  final String wire;

  static CommunityStatus fromWire(String? value) => values.firstWhere(
        (status) => status.wire == value,
        orElse: () => CommunityStatus.pendingApproval,
      );

  String get label => switch (this) {
        CommunityStatus.pendingApproval => 'मंज़ूरी बाकी',
        CommunityStatus.active => 'सक्रिय',
        CommunityStatus.rejected => 'अस्वीकृत',
        CommunityStatus.suspended => 'रोका गया',
        CommunityStatus.archived => 'बंद',
      };

  /// What the leader should understand about this state, in one sentence.
  String get explanation => switch (this) {
        CommunityStatus.pendingApproval =>
          'आपका समुदाय मंज़ूरी की प्रतीक्षा में है। तब तक कोई सदस्य नहीं जुड़ सकता।',
        CommunityStatus.active => 'आपका समुदाय चालू है और नए सदस्य जुड़ सकते हैं।',
        CommunityStatus.rejected => 'यह अनुरोध अस्वीकार कर दिया गया।',
        CommunityStatus.suspended =>
          'यह समुदाय फ़िलहाल रोका गया है। सहायता टीम से संपर्क करें।',
        CommunityStatus.archived => 'यह समुदाय बंद कर दिया गया है।',
      };

  /// Whether the leader may still change anything.
  bool get isEditable => this == CommunityStatus.pendingApproval ||
      this == CommunityStatus.active ||
      this == CommunityStatus.suspended;
}

/// What someone sees *before* joining — the "is this the right place?" screen.
///
/// Deliberately smaller than the full community record: a person holding a
/// forwarded code is not a member yet and has no business seeing the leader's
/// details or the contact information.
class CommunityPreview {
  const CommunityPreview({
    required this.id,
    required this.name,
    required this.type,
    required this.joinCode,
    required this.memberCount,
    required this.isAcceptingMembers,
    this.description,
    this.joinCodeHindi,
    this.city,
    this.district,
    this.state,
    this.blockReason,
  });

  factory CommunityPreview.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>? ?? const {};

    return CommunityPreview(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      type: CommunityType.fromWire(json['type'] as String?),
      joinCode: json['joinCode'] as String? ?? '',
      memberCount: json['memberCount'] as int? ?? 0,
      isAcceptingMembers: json['isAcceptingMembers'] as bool? ?? false,
      description: json['description'] as String?,
      joinCodeHindi: json['joinCodeHindi'] as String?,
      city: location['city'] as String?,
      district: location['district'] as String?,
      state: location['state'] as String?,
      blockReason: JoinBlockReason.fromWire(json['unavailableReason'] as String?),
    );
  }

  final String id;
  final String name;
  final CommunityType type;

  /// The canonical code, echoed back. Showing `SURAJ-KAMAL` after someone typed
  /// `surajkamal` is what tells them the app understood.
  final String joinCode;

  /// `सूरज-कमल`, or null when the leader chose a custom code.
  final String? joinCodeHindi;

  final int memberCount;
  final bool isAcceptingMembers;
  final String? description;
  final String? city;
  final String? district;
  final String? state;
  final JoinBlockReason? blockReason;

  /// "Barabanki, Uttar Pradesh" — the strongest signal that this is the right
  /// community, and often the only one a member will recognise.
  String? get placeLabel {
    final parts = <String?>[city, district, state]
        .where((part) => part != null && part.trim().isNotEmpty)
        .cast<String>()
        .toList();
    return parts.isEmpty ? null : parts.join(', ');
  }
}

/// The community a member belongs to, as returned after joining and by `/mine`.
class Community {
  const Community({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    required this.joinCode,
    required this.memberCount,
    required this.isJoinable,
    required this.isAcceptingMembers,
    this.description,
    this.joinCodeHindi,
    this.joinCodeIsCustom = false,
    this.city,
    this.district,
    this.state,
    this.pincode,
    this.rejectionReason,
  });

  factory Community.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>? ?? const {};

    return Community(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      type: CommunityType.fromWire(json['type'] as String?),
      status: CommunityStatus.fromWire(json['status'] as String?),
      joinCode: json['joinCode'] as String? ?? '',
      memberCount: json['memberCount'] as int? ?? 0,
      isJoinable: json['isJoinable'] as bool? ?? false,
      isAcceptingMembers: json['isAcceptingMembers'] as bool? ?? false,
      description: json['description'] as String?,
      joinCodeHindi: json['joinCodeHindi'] as String?,
      joinCodeIsCustom: json['joinCodeIsCustom'] as bool? ?? false,
      city: location['city'] as String?,
      district: location['district'] as String?,
      state: location['state'] as String?,
      pincode: location['pincode'] as String?,
      rejectionReason: json['rejectionReason'] as String?,
    );
  }

  final String id;
  final String name;
  final CommunityType type;
  final CommunityStatus status;
  final String joinCode;
  final String? joinCodeHindi;
  final bool joinCodeIsCustom;
  final int memberCount;

  /// The leader's own recruitment switch.
  final bool isJoinable;

  /// `isJoinable` **and** approved. What the join endpoint actually checks, so
  /// the UI must not recompute it from the two halves and risk disagreeing.
  final bool isAcceptingMembers;

  final String? description;
  final String? city;
  final String? district;
  final String? state;
  final String? pincode;
  final String? rejectionReason;

  /// "Barabanki, Uttar Pradesh", or null when no location was given.
  String? get placeLabel {
    final parts = <String?>[city, district, state]
        .where((part) => part != null && part.trim().isNotEmpty)
        .cast<String>()
        .toList();
    return parts.isEmpty ? null : parts.join(', ');
  }
}

/// What a tapped invite link resolves to, and why it might be dead.
enum InviteProblem {
  notFound('NOT_FOUND'),
  expired('EXPIRED'),
  used('USED'),
  revoked('REVOKED'),
  communityUnavailable('COMMUNITY_UNAVAILABLE');

  const InviteProblem(this.wire);

  final String wire;

  static InviteProblem? fromWire(String? value) {
    if (value == null) return null;
    for (final problem in values) {
      if (problem.wire == value) return problem;
    }
    return null;
  }

  String get message => switch (this) {
        InviteProblem.notFound => 'यह निमंत्रण लिंक सही नहीं है।',
        InviteProblem.expired => 'यह निमंत्रण समाप्त हो गया। नया निमंत्रण माँगें।',
        InviteProblem.used => 'यह निमंत्रण पहले ही उपयोग हो चुका है।',
        InviteProblem.revoked => 'यह निमंत्रण रद्द कर दिया गया था।',
        InviteProblem.communityUnavailable => 'यह समुदाय अभी उपलब्ध नहीं है।',
      };
}

class InvitePreview {
  const InvitePreview({
    required this.communityId,
    required this.communityName,
    required this.memberCount,
    this.communityDescription,
    this.problem,
  });

  factory InvitePreview.fromJson(Map<String, dynamic> json) => InvitePreview(
        communityId: json['communityId'] as String? ?? '',
        communityName: json['communityName'] as String? ?? '',
        memberCount: json['memberCount'] as int? ?? 0,
        communityDescription: json['communityDescription'] as String?,
        problem: InviteProblem.fromWire(json['problem'] as String?),
      );

  final String communityId;
  final String communityName;
  final int memberCount;
  final String? communityDescription;
  final InviteProblem? problem;

  bool get isUsable => problem == null;
}
