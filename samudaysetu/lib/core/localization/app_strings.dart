import 'package:flutter/material.dart';

/// Hindi is the default; English is the option — not the reverse.
///
/// Hand-written for the scaffold so the app compiles and runs with zero codegen.
/// Migrate to `flutter gen-l10n` + `.arb` files once the copy stabilises.
class AppStrings {
  const AppStrings(this.locale);

  final Locale locale;

  static const List<Locale> supportedLocales = <Locale>[
    Locale('hi'),
    Locale('en'),
    Locale('bho'),
  ];

  static AppStrings of(BuildContext context) =>
      Localizations.of<AppStrings>(context, AppStrings) ?? const AppStrings(Locale('hi'));

  static const LocalizationsDelegate<AppStrings> delegate = _AppStringsDelegate();

  static const Map<String, Map<String, String>> _values = <String, Map<String, String>>{
    'hi': <String, String>{
      'appName': 'समुदाय सेतु',
      'continueLabel': 'आगे बढ़ें',
      'enterPhone': 'अपना मोबाइल नंबर दर्ज करें',
      'enterOtp': 'OTP दर्ज करें',
      'directory': 'सदस्य सूची',
      'myHierarchy': 'मेरा संगठन',
      'profile': 'प्रोफ़ाइल',
      'retry': 'पुनः प्रयास करें',
      'offline': 'आप ऑफ़लाइन हैं',
    },
    'en': <String, String>{
      'appName': 'Samuday Setu',
      'continueLabel': 'Continue',
      'enterPhone': 'Enter your mobile number',
      'enterOtp': 'Enter the OTP',
      'directory': 'Member directory',
      'myHierarchy': 'My organisation',
      'profile': 'Profile',
      'retry': 'Retry',
      'offline': 'You are offline',
    },
  };

  String _t(String key) =>
      _values[locale.languageCode]?[key] ?? _values['hi']?[key] ?? key;

  String get appName => _t('appName');
  String get continueLabel => _t('continueLabel');
  String get enterPhone => _t('enterPhone');
  String get enterOtp => _t('enterOtp');
  String get directory => _t('directory');
  String get myHierarchy => _t('myHierarchy');
  String get profile => _t('profile');
  String get retry => _t('retry');
  String get offline => _t('offline');
}

class _AppStringsDelegate extends LocalizationsDelegate<AppStrings> {
  const _AppStringsDelegate();

  @override
  bool isSupported(Locale locale) =>
      AppStrings.supportedLocales.any((l) => l.languageCode == locale.languageCode);

  @override
  Future<AppStrings> load(Locale locale) async => AppStrings(locale);

  @override
  bool shouldReload(_AppStringsDelegate old) => false;
}
