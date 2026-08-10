# Samuday Setu — Admin console

React 18 · TypeScript (strict) · Vite · React Router · TanStack Query · Axios · Tailwind

```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:5173 (proxies /api → 127.0.0.1:4000)
```

The backend must be running first — see `../backend/README.md`.

## Authentication

Sign-in is email + password, and only `SUPER_ADMIN` and `ADMIN` accounts are accepted;
the server rejects everyone else at `/auth/login` and the client checks again before
storing a session. There is no TOTP step yet — the backend has no TOTP support, so a
2FA field here would be theatre.

Access and refresh tokens are held in `localStorage` behind `src/api/tokenStore.ts`.
That is a deliberate trade-off: the same endpoints serve the Flutter app, which has no
cookie jar, so the API returns the refresh token in the response body rather than in an
`HttpOnly` cookie. Every read and write goes through that one module, so moving to
cookie auth later is a single-file change.

`src/api/client.ts` refreshes expired access tokens automatically. Refreshes are
single-flight: parallel queries that all 401 share one refresh call, because the server
rotates refresh tokens and would treat concurrent refreshes as replay.

## First super admin

Created from the server, never from this UI — an endpoint that mints a super admin is a
permanent backdoor:

```bash
cd ../backend
npm run create:superadmin -- --email you@example.com --name "Your Name" --password '<min 12 chars>'
```

## Roles

| Role          | Console access | Capabilities                                                  |
| ------------- | -------------- | ------------------------------------------------------------- |
| `SUPER_ADMIN` | yes            | Everything, including deleting accounts                        |
| `ADMIN`       | yes            | Read, create, assign roles, manage status, revoke sessions     |
| `LEADER`      | no             | `user:read` only                                               |
| `USER`        | no             | Member. Signs in on mobile with OTP                            |

An actor may only grant roles strictly below their own, and may only act on users
ranked below their own. Both rules are enforced server-side in
`backend/src/core/security/roles.ts`; the UI mirrors them only to avoid offering
buttons that are guaranteed to fail.

## Screens

| Route     | State                                                      |
| --------- | ---------------------------------------------------------- |
| `/`       | Live — account counts by role, API status and uptime        |
| `/health` | Live — `/api/v1/status`                                     |
| `/users`  | Live — list, create, assign role, suspend, delete           |
| `/audit`  | Placeholder — no audit module exists in the backend yet     |
