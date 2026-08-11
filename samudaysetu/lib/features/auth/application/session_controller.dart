import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/storage/secure_storage.dart';
import '../data/auth_api.dart';
import '../domain/app_user.dart';

/// What the app should be showing right now.
///
/// `restoring` is a distinct state on purpose. On a cold start the user is
/// neither signed in nor signed out until `/users/me` answers; collapsing that
/// into "signed out" flashes the login screen on every launch.
enum SessionStatus { restoring, signedOut, signedIn }

/// The single source of truth for "where does the user belong".
///
/// Onboarding lives here alongside authentication because routing needs both,
/// and needs them synchronously — a redirect cannot await. Keeping them in one
/// state object is what lets `app_router.dart` stay a pure function of state.
class SessionState {
  const SessionState({
    required this.status,
    required this.onboardingSeen,
    this.user,
  });

  const SessionState.restoring({required this.onboardingSeen})
      : status = SessionStatus.restoring,
        user = null;

  final SessionStatus status;
  final bool onboardingSeen;
  final AppUser? user;

  bool get isSignedIn => status == SessionStatus.signedIn && user != null;
  bool get isRestoring => status == SessionStatus.restoring;

  SessionState copyWith({
    SessionStatus? status,
    bool? onboardingSeen,
    AppUser? user,
    bool clearUser = false,
  }) =>
      SessionState(
        status: status ?? this.status,
        onboardingSeen: onboardingSeen ?? this.onboardingSeen,
        user: clearUser ? null : (user ?? this.user),
      );
}

class SessionController extends Notifier<SessionState> {
  late final AuthApi _api = ref.read(authApiProvider);
  late final SecureStorage _storage = ref.read(secureStorageProvider);

  @override
  SessionState build() {
    final prefs = ref.read(appPreferencesProvider);

    // The HTTP client cannot import this controller (it would be a cycle), so
    // it calls back through a hook instead. Registered before the first request
    // can possibly be made.
    ref.read(sessionExpiredCallbackProvider).register(_onSessionExpired);

    // Deliberately not awaited: `build` must return synchronously so the router
    // has a state to redirect on from the very first frame.
    unawaited(_restore());

    return SessionState.restoring(onboardingSeen: prefs.onboardingSeen);
  }

  /// Cold-start restore. A stored token proves nothing on its own — the account
  /// may have been suspended or deleted since — so it is exchanged for the live
  /// user before the app trusts it.
  Future<void> _restore() async {
    // Every failure path below has to end in `signedOut`, including a keystore
    // that refuses to open. Leaving `restoring` set would strand the user on the
    // splash screen forever, with no error and no way out but a reinstall.
    try {
      final refreshToken = await _storage.readRefreshToken();
      if (refreshToken == null) {
        state = state.copyWith(status: SessionStatus.signedOut, clearUser: true);
        return;
      }

      final user = await _api.me();
      state = state.copyWith(status: SessionStatus.signedIn, user: user);
    } on Object {
      // The interceptor already attempted a refresh and cleared the tokens if
      // it failed. Anything reaching here means "no usable session".
      try {
        await _storage.clearSession();
      } on Object {
        // Storage is unavailable; there is nothing left to clean up.
      }
      state = state.copyWith(status: SessionStatus.signedOut, clearUser: true);
    }
  }

  Future<void> completeOnboarding() async {
    if (state.onboardingSeen) return;
    await ref.read(appPreferencesProvider).markOnboardingSeen();
    state = state.copyWith(onboardingSeen: true);
  }

  /// Called by the OTP screen once the server has issued tokens. Persisting and
  /// flipping the state happen together so there is no window where the app
  /// looks signed in but has nothing to authenticate with.
  Future<void> signIn(AuthResult result) async {
    await _storage.writeTokens(
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    );
    state = state.copyWith(status: SessionStatus.signedIn, user: result.user);
  }

  /// Re-reads the signed-in user from the server.
  ///
  /// Needed after anything that changes the account itself rather than a screen's
  /// data — joining or leaving a community moves `communityId`, and routing and
  /// the home screen's prompt both key off it. Without this the app keeps telling
  /// a member to join something they just joined.
  ///
  /// A failure here is deliberately swallowed: the action that prompted the
  /// refresh already succeeded on the server, and tearing down the session
  /// because a follow-up read timed out would be a far worse outcome than a
  /// briefly stale name.
  Future<void> refreshUser() async {
    try {
      final user = await _api.me();
      state = state.copyWith(user: user);
    } on Object {
      // Stale is survivable; signed-out is not.
    }
  }

  Future<void> signOut() async {
    final refreshToken = await _storage.readRefreshToken();

    // Revoke server-side first, but never let a failed call trap the user in a
    // session they asked to leave.
    if (refreshToken != null) {
      try {
        await _api.logout(refreshToken);
      } on Object {
        // Best effort. The local credentials are cleared regardless.
      }
    }

    await _storage.clearSession();
    state = state.copyWith(status: SessionStatus.signedOut, clearUser: true);
  }

  Future<void> _onSessionExpired() async {
    await _storage.clearSession();
    state = state.copyWith(status: SessionStatus.signedOut, clearUser: true);
  }
}

final sessionControllerProvider =
    NotifierProvider<SessionController, SessionState>(SessionController.new);
