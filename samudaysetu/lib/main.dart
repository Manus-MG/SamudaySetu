import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/providers.dart';
import 'core/storage/app_preferences.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Portrait only: every screen in this app is a single column, and landscape
  // would only mean a keyboard covering the field the user is typing into.
  await SystemChrome.setPreferredOrientations(<DeviceOrientation>[
    DeviceOrientation.portraitUp,
  ]);

  // Resolved here, before the first frame, so routing can read the onboarding
  // flag synchronously — a redirect cannot await, and an async read would mean
  // one frame of the wrong screen on every cold start.
  final preferences = await AppPreferences.load();

  runApp(
    ProviderScope(
      overrides: <Override>[
        appPreferencesProvider.overrideWithValue(preferences),
      ],
      child: const SamudaySetuApp(),
    ),
  );
}
