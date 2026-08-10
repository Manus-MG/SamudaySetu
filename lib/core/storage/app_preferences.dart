import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';

/// Non-secret, non-critical flags. Anything a rooted device reading this file
/// could use against the user belongs in [SecureStorage] instead.
class AppPreferences {
  const AppPreferences(this._prefs);

  final SharedPreferences _prefs;

  static Future<AppPreferences> load() async =>
      AppPreferences(await SharedPreferences.getInstance());

  /// Whether the carousel has been completed. Read synchronously during routing,
  /// which is why the instance is resolved once at startup rather than awaited
  /// inside a redirect.
  bool get onboardingSeen => _prefs.getBool(AppConfig.onboardingSeenKey) ?? false;

  Future<void> markOnboardingSeen() =>
      _prefs.setBool(AppConfig.onboardingSeenKey, true);
}
