/// A one-tap invite addressed to a single phone number.
///
/// Mirrors the invite DTOs in `backend/src/modules/communities/invites`.
library;

enum InviteStatus {
  sent('SENT'),
  accepted('ACCEPTED'),
  revoked('REVOKED');

  const InviteStatus(this.wire);

  final String wire;

  static InviteStatus fromWire(String? value) => values.firstWhere(
        (status) => status.wire == value,
        orElse: () => InviteStatus.sent,
      );
}

class Invite {
  const Invite({
    required this.id,
    required this.communityId,
    required this.phoneMasked,
    required this.status,
    required this.isUsable,
    required this.smsDelivered,
    required this.expiresAt,
    required this.createdAt,
    this.acceptedAt,
  });

  factory Invite.fromJson(Map<String, dynamic> json) => Invite(
        id: json['id'] as String? ?? '',
        communityId: json['communityId'] as String? ?? '',
        phoneMasked: json['phoneMasked'] as String? ?? '',
        status: InviteStatus.fromWire(json['status'] as String?),
        isUsable: json['isUsable'] as bool? ?? false,
        smsDelivered: json['smsDelivered'] as bool? ?? false,
        expiresAt: DateTime.tryParse(json['expiresAt'] as String? ?? ''),
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
        acceptedAt: DateTime.tryParse(json['acceptedAt'] as String? ?? ''),
      );

  final String id;
  final String communityId;

  /// Masked by the server. The full number never reaches the app.
  final String phoneMasked;

  final InviteStatus status;

  /// `SENT` and not yet past its expiry. Derived server-side so the app and the
  /// server never disagree because of a wrong device clock.
  final bool isUsable;

  final bool smsDelivered;
  final DateTime? expiresAt;
  final DateTime? createdAt;
  final DateTime? acceptedAt;

  /// One word, in Hindi, covering the four states a leader cares about.
  String get statusLabel => switch (status) {
        InviteStatus.accepted => 'जुड़ गए',
        InviteStatus.revoked => 'रद्द',
        InviteStatus.sent => isUsable ? 'प्रतीक्षा में' : 'समय समाप्त',
      };
}

/// The result of sending one invite.
class SentInvite {
  const SentInvite({
    required this.invite,
    required this.inviteUrl,
    required this.whatsAppUrl,
    required this.smsDelivered,
  });

  factory SentInvite.fromJson(Map<String, dynamic> json) => SentInvite(
        invite: Invite.fromJson(json['invite'] as Map<String, dynamic>? ?? const {}),
        inviteUrl: json['inviteUrl'] as String? ?? '',
        whatsAppUrl: json['whatsAppUrl'] as String? ?? '',
        smsDelivered: json['smsDelivered'] as bool? ?? false,
      );

  final Invite invite;

  /// Returned in the clear because no SMS provider is connected yet — the leader
  /// forwards it themselves. See `core/sms` on the server.
  final String inviteUrl;

  final String whatsAppUrl;
  final bool smsDelivered;
}

/// One page of a paginated list. Mirrors `Paginated<T>` on the server.
class Paged<T> {
  const Paged({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
  });

  factory Paged.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) parse,
  ) =>
      Paged<T>(
        items: (json['items'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .map(parse)
            .toList(growable: false),
        total: json['total'] as int? ?? 0,
        page: json['page'] as int? ?? 1,
        totalPages: json['totalPages'] as int? ?? 1,
      );

  final List<T> items;
  final int total;
  final int page;
  final int totalPages;

  bool get hasMore => page < totalPages;
}
