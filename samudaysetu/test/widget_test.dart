import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samudaysetu/app.dart';

void main() {
  testWidgets('app boots and lands on the login screen', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: SamudaySetuApp()));
    await tester.pumpAndSettle();

    // Unauthenticated users are redirected to the single phone-entry screen.
    expect(find.text('समुदाय सेतु'), findsWidgets);
  });
}
