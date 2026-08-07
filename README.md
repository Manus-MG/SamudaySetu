# Samuday Setu — Mobile

Flutter · Riverpod · go_router · Dio · Drift (offline-first)

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1
```

`10.0.2.2` is how the Android emulator reaches `localhost` on the host machine.
On a physical device use your machine's LAN IP.

## Structure — feature-first clean architecture

```
lib/
├── core/          network · storage · sync · router · theme · localization · error
├── features/      auth · onboarding · community · directory · hierarchy · profile
│   └── <feature>/ data (dto, datasources, repositories)
│                  domain (entities, repositories, usecases)
│                  presentation (providers, screens, widgets)
└── main.dart
```

## Non-negotiable constraints

- **Offline-first.** Every write hits the local outbox first and syncs in the
  background; the UI reads from Drift. See `lib/core/sync/`.
- **Hindi is the default locale**, English is the option.
- Refresh tokens live in `flutter_secure_storage` — never `SharedPreferences`.
- Target device: Rs 7,000 Android phone, 2GB RAM, Android 10. Budget **< 40MB APK**.

## Codegen

```bash
dart run build_runner build --delete-conflicting-outputs
```

Needed once freezed / json_serializable / riverpod_generator / drift models land.
