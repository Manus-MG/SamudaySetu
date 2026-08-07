import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/auth_session.dart';

/// Minimal auth state for the scaffold. Replace with a `Notifier` backed by
/// `AuthRepository` once the auth module lands on the backend.
class AuthState {
  const AuthState({this.session, this.isLoading = false});

  final AuthSession? session;
  final bool isLoading;

  bool get isAuthenticated => session != null;

  AuthState copyWith({AuthSession? session, bool? isLoading}) =>
      AuthState(session: session ?? this.session, isLoading: isLoading ?? this.isLoading);
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  // ignore: use_setters_to_change_properties
  void setSession(AuthSession session) => state = state.copyWith(session: session);

  void signOut() => state = const AuthState();
}

final authStateProvider =
    NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
