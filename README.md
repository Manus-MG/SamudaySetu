# Samuday Setu — mobile app

Flutter · Riverpod · go_router · Dio · [shadcn_ui](https://mariuti.com/flutter-shadcn-ui/)

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1
```

`10.0.2.2` is the Android emulator's alias for your machine's `localhost`. On a
physical device, pass your machine's LAN IP instead. The backend must be running
first — see `../backend/README.md`.

## What exists

Splash → onboarding carousel → phone → OTP → home. Every screen talks to the
real API; nothing is mocked.

| Screen | Endpoint |
| --- | --- |
| Splash | `GET /users/me` (restore a stored session) |
| Onboarding | none — local flag, shown once per install |
| Phone | `POST /auth/otp/request` |
| OTP | `POST /auth/otp/verify` |
| Home | session state, `POST /auth/logout` |

Directory, hierarchy and profile are named on the home screen as not-yet-built
rather than shown as empty tabs. The backend has no endpoints for them.

## Login is phone + OTP only

There is no password field, and that is deliberate: `/auth/login` accepts
`SUPER_ADMIN` and `ADMIN` only, so it is the admin console's door, not this
app's. Members and leaders sign in with a phone number.

One entry point covers login *and* signup. An unknown number creates the account
on verification and comes back with `isNewUser: true`. A first-time user is never
asked to choose between "Login" and "Sign up" — it is a decision they cannot make
correctly and support pays for it.

**No SMS provider is wired up yet.** The server logs the code to its console and,
outside production, returns it as `devCode`, which this app surfaces in a toast.
That is the whole reason the flow is testable today, and the first thing to
replace before any real user sees it.

## Architecture

```
lib/
  core/
    config/      compile-time constants and the API base URL
    network/     Dio, the refresh interceptor, one failure type
    router/      routes, redirects, transitions
    storage/     keystore (tokens) and preferences (flags)
    theme/       shadcn theme + the motion scale
    widgets/     the shared entrance animation
    providers.dart
  features/<feature>/
    application/  controllers
    data/         API wrappers
    domain/       models
    presentation/ screens
```

**Tokens.** Access and refresh tokens go to the Android keystore / iOS keychain
via `flutter_secure_storage`, never `SharedPreferences`. `AuthInterceptor` is a
`QueuedInterceptor`, not a plain one: that serialises `onError`, so six parallel
401s trigger one refresh instead of six. It matters because the server rotates
refresh tokens and reads a second use of the same one as replay — six concurrent
refreshes would revoke the device family and sign the user out.

**Routing.** `SessionController` owns both the auth status and the onboarding
flag, because a `redirect` cannot await and needs both synchronously. The router
is built once and reacts through `refreshListenable`; rebuilding a `GoRouter`
discards the navigation stack.

**Motion.** Durations and curves live in `core/theme/motion.dart` and nowhere
else. Everything animated is opacity or transform — compositor-only, no repaints
— because the target device is a ~₹7,000 Android phone with 2 GB RAM.

## Dependencies

Nine, and each earns its place. `drift`, `sqlite3_flutter_libs`,
`connectivity_plus`, `cached_network_image`, `freezed` and `json_serializable`
were removed: the offline-first outbox was a README stub, and the native SQLite
libraries alone cost 3–4 MB of APK for code that did not exist. Add them back
when there is data worth caching — the outbox is easier to design once the writes
are known.

There is no `build_runner` step. Two hand-written models do not justify codegen
in every developer's edit loop.

## Tests

```bash
flutter test
```

Covers the two routing decisions that are easiest to break and hardest to
notice: a first launch lands on onboarding, a repeat launch skips it.
