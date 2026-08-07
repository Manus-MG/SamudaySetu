import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/localization/app_strings.dart';

/// Phone + OTP is the only member login. No passwords: users are often on shared
/// devices in rural UP/Bihar, and password resets are a support load of two people
/// cannot carry (ARCHITECTURE.md §3.1).
class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = AppStrings.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const Spacer(),
              Text(strings.appName, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 32),
              TextField(
                keyboardType: TextInputType.phone,
                maxLength: 10,
                decoration: InputDecoration(
                  labelText: strings.enterPhone,
                  prefixText: '+91 ',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: null,
                child: Text(strings.continueLabel),
              ),
              const Spacer(flex: 2),
            ],
          ),
        ),
      ),
    );
  }
}
