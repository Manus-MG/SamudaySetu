import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/data/auth_api.dart';
import '../features/community/data/community_api.dart';
import 'network/api_client.dart';
import 'storage/app_preferences.dart';
import 'storage/secure_storage.dart';

/// Wiring for the whole app, in one file.
///
/// Small enough that splitting it across `core/*/providers.dart` would cost more
/// in navigation than it saves in file length. Split it when it stops fitting on
/// a screen, not before.

/// Overridden in `main()` once `SharedPreferences` has loaded, so routing can
/// read the onboarding flag synchronously instead of awaiting inside a redirect.
final appPreferencesProvider = Provider<AppPreferences>(
  (ref) => throw UnimplementedError('appPreferencesProvider must be overridden in main()'),
);

final secureStorageProvider = Provider<SecureStorage>(
  (ref) => const SecureStorage(SecureStorage.defaultStorage),
);

/// Set by `SessionController` at startup. The client needs a way to tell the
/// session layer "the refresh failed, this session is over", but the session
/// layer already depends on the client — this indirection breaks the cycle
/// without either side importing the other.
final sessionExpiredCallbackProvider = Provider<_SessionExpiredHook>(
  (ref) => _SessionExpiredHook(),
);

class _SessionExpiredHook {
  Future<void> Function()? _handler;

  // ignore: use_setters_to_change_properties
  void register(Future<void> Function() handler) => _handler = handler;

  Future<void> call() async => _handler?.call();
}

final apiClientProvider = Provider<ApiClient>((ref) {
  final onExpired = ref.watch(sessionExpiredCallbackProvider);
  return ApiClient.create(
    storage: ref.watch(secureStorageProvider),
    onSessionExpired: onExpired.call,
  );
});

final authApiProvider = Provider<AuthApi>(
  (ref) => AuthApi(ref.watch(apiClientProvider)),
);

final communityApiProvider = Provider<CommunityApi>(
  (ref) => CommunityApi(ref.watch(apiClientProvider)),
);
