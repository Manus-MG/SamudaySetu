import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

/// `ShadApp.custom` wrapping a `MaterialApp.router` is the supported way to run
/// shadcn components alongside Material ones.
///
/// The nesting is not arbitrary:
///   - `ShadApp.custom` owns the shadcn theme and derives a matching Material
///     `ThemeData`, which `Theme.of(context)` inside `appBuilder` picks up. One
///     palette, not two hand-synced ones.
///   - `MaterialApp.router` owns navigation, so go_router keeps working.
///   - `ShadAppBuilder` installs the overlays shadcn needs — toaster, sonner,
///     popovers. Without it `ShadToaster.of(context)` throws at runtime.
class SamudaySetuApp extends ConsumerWidget {
  const SamudaySetuApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    // Starts the OS link listener and keeps it alive for as long as the app is.
    // Watched rather than read so the provider is created during the first
    // build — a link tapped before the first frame is parked, not dropped.
    ref.watch(deepLinkServiceProvider);

    return ShadApp.custom(
      themeMode: ThemeMode.system,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      appBuilder: (context) => MaterialApp.router(
        title: 'Samuday Setu',
        debugShowCheckedModeBanner: false,
        routerConfig: router,
        theme: AppTheme.materialFrom(Theme.of(context)),
        // Hindi is the default, not the fallback. The English option comes when
        // there is a language switcher to expose it.
        locale: const Locale('hi'),
        supportedLocales: const <Locale>[Locale('hi'), Locale('en')],
        localizationsDelegates: const <LocalizationsDelegate<Object>>[
          GlobalShadLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        builder: (context, child) => ShadAppBuilder(child: child!),
      ),
    );
  }
}
