/// Mirrors `UserDto` in `backend/src/modules/users/users.types.ts`.
///
/// Hand-written rather than generated: two models do not justify a `build_runner`
/// step in every developer's edit loop. The rule is the same one the admin app
/// follows — nothing in here may describe a field the API does not return.
enum UserRole {
  superAdmin('SUPER_ADMIN'),
  admin('ADMIN'),
  leader('LEADER'),
  user('USER');

  const UserRole(this.wire);

  /// The exact string the API sends. Never derive it from the enum name.
  final String wire;

  /// Unknown roles fall back to the least-privileged one. A server that adds a
  /// role should never accidentally grant an old client more than it had.
  static UserRole fromWire(String? value) => values.firstWhere(
        (role) => role.wire == value,
        orElse: () => UserRole.user,
      );

  String get label => switch (this) {
        UserRole.superAdmin => 'सुपर एडमिन',
        UserRole.admin => 'एडमिन',
        UserRole.leader => 'नेता',
        UserRole.user => 'सदस्य',
      };
}

enum UserStatus {
  pendingProfile('PENDING_PROFILE'),
  active('ACTIVE'),
  suspended('SUSPENDED'),
  deleted('DELETED');

  const UserStatus(this.wire);

  final String wire;

  static UserStatus fromWire(String? value) => values.firstWhere(
        (status) => status.wire == value,
        orElse: () => UserStatus.pendingProfile,
      );
}

class AppUser {
  const AppUser({
    required this.id,
    required this.role,
    required this.status,
    required this.isProfileComplete,
    this.phone,
    this.email,
    this.fullName,
    this.preferredLanguage = 'hi',
    this.lastLoginAt,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String? ?? '',
        role: UserRole.fromWire(json['role'] as String?),
        status: UserStatus.fromWire(json['status'] as String?),
        isProfileComplete: json['isProfileComplete'] as bool? ?? false,
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        fullName: json['fullName'] as String?,
        preferredLanguage: json['preferredLanguage'] as String? ?? 'hi',
        lastLoginAt: DateTime.tryParse(json['lastLoginAt'] as String? ?? ''),
      );

  final String id;
  final UserRole role;
  final UserStatus status;
  final bool isProfileComplete;
  final String? phone;
  final String? email;
  final String? fullName;
  final String preferredLanguage;
  final DateTime? lastLoginAt;

  /// What to greet the user with before they have given a name.
  String get displayName {
    final name = fullName?.trim();
    if (name != null && name.isNotEmpty) return name;
    return phone ?? 'सदस्य';
  }

  /// The first letter, for the avatar fallback.
  ///
  /// Uses runes rather than `substring(0, 1)` so a Devanagari name is not cut
  /// mid-code-unit into a replacement character.
  String get initials {
    final source = displayName.trim();
    if (source.isEmpty) return '?';
    return String.fromCharCode(source.runes.first).toUpperCase();
  }
}

/// The token half of `AuthResult`. Kept separate from [AppUser] because tokens
/// go to secure storage and the user goes to the widget tree — they have
/// different lifetimes and very different blast radii if leaked.
class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken});

  factory AuthTokens.fromJson(Map<String, dynamic> json) => AuthTokens(
        accessToken: json['accessToken'] as String? ?? '',
        refreshToken: json['refreshToken'] as String? ?? '',
      );

  final String accessToken;
  final String refreshToken;

  bool get isValid => accessToken.isNotEmpty && refreshToken.isNotEmpty;
}

/// The full `/auth/otp/verify` result.
class AuthResult {
  const AuthResult({
    required this.tokens,
    required this.user,
    required this.isNewUser,
  });

  factory AuthResult.fromJson(Map<String, dynamic> json) => AuthResult(
        tokens: AuthTokens.fromJson(json),
        user: AppUser.fromJson(json['user'] as Map<String, dynamic>? ?? const {}),
        isNewUser: json['isNewUser'] as bool? ?? false,
      );

  final AuthTokens tokens;
  final AppUser user;

  /// True when this OTP verification created the account. Drives onboarding
  /// once there is a profile step to route to.
  final bool isNewUser;
}

/// The `/auth/otp/request` result.
class OtpChallenge {
  const OtpChallenge({
    required this.expiresInSeconds,
    required this.resendAfterSeconds,
    this.devCode,
  });

  factory OtpChallenge.fromJson(Map<String, dynamic> json) => OtpChallenge(
        expiresInSeconds: json['expiresInSeconds'] as int? ?? 300,
        resendAfterSeconds: json['resendAfterSeconds'] as int? ?? 30,
        devCode: json['devCode'] as String?,
      );

  final int expiresInSeconds;
  final int resendAfterSeconds;

  /// Populated by the server outside production only, because no SMS provider
  /// is wired up yet. Shown in the UI in debug builds so the flow is testable.
  final String? devCode;
}
