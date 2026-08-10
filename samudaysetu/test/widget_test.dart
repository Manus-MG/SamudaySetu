import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samudaysetu/app.dart';
import 'package:samudaysetu/core/providers.dart';
import 'package:samudaysetu/core/storage/app_preferences.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Boot tests. They assert the two routing decisions that are easiest to break
/// and hardest to notice: a first launch must land on onboarding, and a repeat
/// launch must skip it.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<AppPreferences> preferencesWith({required bool onboardingSeen}) async {
    SharedPreferences.setMockInitialValues(<String, Object>{
      'onboarding_seen': onboardingSeen,
    });
    return AppPreferences.load();
  }

  Future<void> pumpApp(WidgetTester tester, AppPreferences preferences) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          appPreferencesProvider.overrideWithValue(preferences),
        ],
        child: const SamudaySetuApp(),
      ),
    );
    // `pumpAndSettle` would hang: the splash spinner animates forever while the
    // session restore is in flight against a host that is not there.
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
  }

  testWidgets('a first launch lands on onboarding', (tester) async {
    await pumpApp(tester, await preferencesWith(onboardingSeen: false));

    expect(find.text('अपने समुदाय से जुड़ें'), findsOneWidget);
    expect(find.text('शुरू करें'), findsNothing);
  });

  testWidgets('a returning, signed-out user lands on phone entry', (tester) async {
    await pumpApp(tester, await preferencesWith(onboardingSeen: true));

    expect(find.text('अपना मोबाइल नंबर दर्ज करें'), findsOneWidget);
  });
}
