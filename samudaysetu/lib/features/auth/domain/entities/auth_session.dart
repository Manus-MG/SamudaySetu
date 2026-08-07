/// Authenticated session as the app knows it.
///
/// Roles are deliberately absent: the access JWT carries no role and no tenant, so
/// that removing a leader takes effect immediately rather than in up to 15 minutes.
/// Permissions are resolved server-side per request (ARCHITECTURE.md §3.2).
class AuthSession {
  const AuthSession({
    required this.userId,
    required this.accessToken,
    required this.isProfileComplete,
    this.activeTenantId,
  });

  final String userId;
  final String accessToken;
  final bool isProfileComplete;
  final String? activeTenantId;
}
