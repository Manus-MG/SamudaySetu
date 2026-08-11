# SamudaySetu — Backend API

Node.js + TypeScript (ESM) · Express · MongoDB · Mongoose · Zod · Pino

## Getting started

```bash
npm install
cp .env.example .env      # fill in MONGODB_URI and JWT_ACCESS_SECRET
npm run dev               # http://localhost:4000
```

The process **refuses to boot** on invalid config or an unreachable database. That
is deliberate: an instance that cannot serve requests must never accept traffic.

## Scripts

| Command             | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Watch mode via `tsx`                       |
| `npm run build`     | Type-check and emit to `dist/`             |
| `npm start`         | Run the compiled build                     |
| `npm run typecheck` | Types only, no emit                        |
| `npm run lint`      | ESLint (type-aware rules)                  |
| `npm test`          | Vitest                                     |

## Endpoints

Everything is mounted under `/api/v1`.

| Method | Path             | Purpose                                              |
| ------ | ---------------- | ---------------------------------------------------- |
| GET    | `/health`        | Alias of `/health/ready`                             |
| GET    | `/health/live`   | Liveness — process is up (always 200 while running)  |
| GET    | `/health/ready`  | Readiness — 200 when all dependencies are up, else 503 |
| GET    | `/status`        | Build/runtime snapshot; always 200                   |

### Auth — `/auth`

| Method | Path              | Auth | Purpose                                                     |
| ------ | ----------------- | ---- | ----------------------------------------------------------- |
| POST   | `/otp/request`    | —    | Send a login code to a phone                                 |
| POST   | `/otp/verify`     | —    | Verify the code; signs in, or creates the account (201)      |
| POST   | `/login`          | —    | Email + password. `SUPER_ADMIN` / `ADMIN` only               |
| POST   | `/refresh`        | —    | Rotate the refresh token; returns a new pair                 |
| POST   | `/logout`         | —    | Revoke one refresh token                                     |
| POST   | `/logout-all`     | ✅   | Revoke every session for the caller                          |
| GET    | `/sessions`       | ✅   | List the caller's active devices                             |
| DELETE | `/sessions/:id`   | ✅   | Revoke one of the caller's sessions                          |

### Users — `/users`

All routes require a valid access token.

| Method | Path            | Permission            | Purpose                                    |
| ------ | --------------- | --------------------- | ------------------------------------------ |
| GET    | `/me`           | *(own account)*       | The signed-in user                          |
| PATCH  | `/me`           | *(own account)*       | Update name, gender, language               |
| GET    | `/`             | `user:read`           | Paginated list; filter by role/status/search |
| POST   | `/`             | `user:create`         | Create a staff account (email + password)   |
| GET    | `/:id`          | `user:read`           | One user                                    |
| PATCH  | `/:id/role`     | `user:role:assign`    | Change role; revokes their sessions          |
| PATCH  | `/:id/status`   | `user:status:manage`  | `ACTIVE` / `SUSPENDED`                       |
| DELETE | `/:id`          | `user:delete`         | Erase PII, keep a tombstone                  |

### Communities — `/communities`

All routes require a valid access token. Two authorisation layers apply: the
`requirePermission` guard asks *may this role ever do this*, and the service's
`assertMayManage` narrows a `LEADER` to the single community they run.

| Method | Path                       | Permission                | Purpose                                              |
| ------ | -------------------------- | ------------------------- | ---------------------------------------------------- |
| GET    | `/mine`                    | *(own)*                   | The caller's own community, or `null`                |
| GET    | `/lookup/:code`            | *(own)*                   | Preview a community from a code or QR — rate limited |
| POST   | `/join`                    | *(own)*                   | Join by code. `USER` accounts only                   |
| POST   | `/leave`                   | *(own)*                   | Leave the current community                          |
| GET    | `/`                        | `community:read`          | Paginated list; filter by status/type/search         |
| POST   | `/`                        | `community:create`        | Create. Staff → `ACTIVE`, leader → `PENDING_APPROVAL` |
| GET    | `/:id`                     | `community:read`          | One community                                        |
| PATCH  | `/:id`                     | `community:update`        | Details and the `isJoinable` switch                  |
| PATCH  | `/:id/moderation`          | `community:moderate`      | `APPROVE` / `REJECT` / `SUSPEND` / `REACTIVATE`      |
| PATCH  | `/:id/leader`              | `community:leader:assign` | Assign or replace the single leader                  |
| DELETE | `/:id/leader`              | `community:leader:assign` | Unassign the leader                                  |
| DELETE | `/:id`                     | `community:delete`        | Archive: detach members, release the code            |
| GET    | `/:id/members`             | `community:read`          | Member directory                                     |
| POST   | `/:id/members/reconcile`   | `community:update`        | Recount members from the member rows                 |
| GET    | `/:id/join-kit`            | `community:read`          | Code, link, deep link, QR data URL, share text       |
| GET    | `/:id/join-qr.svg`         | `community:read`          | The QR as a downloadable SVG document                |
| POST   | `/:id/join-code/rotate`    | `community:code:manage`   | Issue a fresh two-word code; the old one dies at once |
| GET    | `/:id/join-code/check`     | `community:code:manage`   | Is this custom code usable? Live check for the UI    |
| PUT    | `/:id/join-code`           | `community:code:manage`   | Set a leader-chosen code, e.g. `GUPTASAMAJ`          |
| GET    | `/:id/invites`             | `community:read`          | Invites sent for this community                      |
| POST   | `/:id/invites`             | `community:code:manage`   | Invite one phone number; returns a one-tap link      |
| DELETE | `/:id/invites/:inviteId`   | `community:code:manage`   | Cancel an outstanding invite                         |
| GET    | `/invites/:token`          | *(own)*                   | Preview a tapped invite link — rate limited          |
| POST   | `/invites/accept`          | *(own)*                   | Join via invite. Bypasses `isJoinable` by design     |

### Audit — `/audit`

Read-only by construction: there is no write route, and the collection rejects
updates and deletes at the ODM layer.

| Method | Path          | Permission   | Purpose                                                  |
| ------ | ------------- | ------------ | -------------------------------------------------------- |
| GET    | `/`           | `audit:read` | Paginated trail; filter by action, resource, actor, dates |
| GET    | `/vocabulary` | `audit:read` | The closed action / resource-type lists, for filter UIs   |

### Join codes

A random string is the hardest possible thing to give someone over a phone call,
and the audience for this product is largely 65+. So a code is either:

- **two everyday Hindi words** — `SURAJ-KAMAL`, shown as `सूरज-कमल`, drawn from a
  curated 201-word list in `joinWords.ts` (~40,000 pairs); or
- **whatever the leader chose** — usually the community's own name, `GUPTASAMAJ`,
  which needs no explaining at all.

The wordlist has properties the unit test enforces, because each one is
load-bearing rather than cosmetic:

- **No word is a prefix of another.** Lookup ignores separators, so `SUR`+`AJGAR`
  and `SURAJ`+`GAR` would otherwise collapse to one key and only one could exist.
- **No two words differ only in their last sound.** These get read aloud down bad
  phone lines.
- **No vowels in the alphabet of custom codes' lookalike groups**, no religious or
  political terms — the same platform sells to a samaj, an RWA and a political
  outfit.

Codes are stored twice: `joinCode` keeps the display form with its hyphens, and
`joinCodeNormalised` strips every separator. **Uniqueness and every lookup use the
normalised form**, so `suraj kamal`, `SURAJ-KAMAL` and `surajkamal` all resolve.
Getting a hyphen wrong is never the reason someone cannot join.

That generosity is safe only because joining is two steps: `lookup` returns a
*preview* and the member confirms their community by name before anything is
written. It is also what makes the one genuinely ambiguous case harmless — two
codes that normalise identically can never both exist, and a member who reaches
the wrong one sees the wrong name and backs out.

## Authentication

Two ways in, by design:

- **Members (`USER`, `LEADER`) — phone + OTP, no password.** Users on shared rural
  devices should not be managing passwords, and password resets are a support
  burden a small team cannot staff.
- **Staff (`SUPER_ADMIN`, `ADMIN`) — email + password** on the web dashboard. These
  accounts control every record in the system, so they get a real credential.

`/otp/verify` is a single entry point for login *and* signup: an unknown phone
creates the account and returns `isNewUser: true`. A low-literacy user should never
have to choose between a "Login" and a "Sign up" button.

### Tokens

| Token   | Lifetime | Form                    | Notes                                    |
| ------- | -------- | ----------------------- | ---------------------------------------- |
| Access  | 15 min   | JWT (`sub`, `did`, `jti`) | **Carries no role** — see below         |
| Refresh | 60 days  | Opaque 256-bit random   | Stored SHA-256 hashed; single-use         |

**Roles are deliberately absent from the JWT.** If a role were baked in, demoting or
suspending someone would take effect only when their token expired. Instead the
actor is resolved from the database on every request, so revocation is immediate —
worth one indexed lookup by primary key.

**Refresh rotation with reuse detection.** Each refresh is single-use and issues a
replacement in the same *family*. Presenting an already-rotated token means it was
stolen, so the whole family is revoked and the user must sign in again.

### Roles

```
SUPER_ADMIN  →  ADMIN  →  LEADER  →  USER
```

**Accounts**

| | `user:read` | `user:create` | `user:update` | `user:role:assign` | `user:status:manage` | `user:delete` |
|---|---|---|---|---|---|---|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| LEADER | ✅ | — | — | — | — | — |
| USER | — | — | — | — | — | — |

**Communities**

| | `create` | `read` | `update` | `moderate` | `leader:assign` | `code:manage` | `delete` | `audit:read` |
|---|---|---|---|---|---|---|---|---|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| LEADER | ✅¹ | ✅² | ✅² | — | — | ✅² | — | — |
| USER | — | — | — | — | — | — | — | — |

¹ One community, which lands in `PENDING_APPROVAL` and cannot recruit until staff
approve it. Enforced by a partial unique index on `leaderId`, not only by a check.
² Scoped by `assertMayManage` to the one community they lead.

Two escalation guards, both enforced in `users.service`:

- **You may only grant roles strictly below your own.** Otherwise any ADMIN can
  promote themselves to SUPER_ADMIN in one request.
- **You may only act on users strictly below your own rank**, so one ADMIN cannot
  suspend or demote another.

Route guards ask for a *permission*, never a role name, so changing who can do what
is a one-line edit to `core/security/roles.ts`.

### OTP hardening

Six digits, hashed at rest, 5-minute TTL, max 5 attempts then a 30-minute lock.
Two independent throttles, because either one alone is defeatable: 3 codes per
phone per hour (in the OTP service) and 10 auth requests per IP per minute (on the
route). Unthrottled OTP is a direct financial attack — every SMS costs money.

No SMS provider is wired yet. Outside production the code is returned as `devCode`
and logged; in production it is never logged.

### First super admin

Deliberately a script, not an endpoint — a route that mints a super admin is a
permanent backdoor no matter how well guarded.

```bash
npm run create:superadmin
```

## Architecture

MVC + services. A request flows in exactly one direction:

```
routes → controller → service → repository → model
```

- **routes** — URL to handler wiring, validation middleware. Nothing else.
- **controller** — HTTP in, HTTP out. Reads the request, calls one service, sends the response. No business logic.
- **service** — business logic. Never imports `express` and never touches Mongoose.
- **repository** — the only place Mongoose is used. Returns plain objects, not documents.
- **model** — Mongoose schema and indexes.
- **schema** — Zod. Validates the request *and* is the source of the inferred TS types.

A module may import another module's **service**, never its repository or model.

```
src/
├── config/       env parsing (Zod) + constants
├── core/         cross-cutting infrastructure, no business logic
│   ├── context/    AsyncLocalStorage request context (requestId, userId)
│   ├── db/         Mongo connection lifecycle + health
│   ├── errors/     AppError + stable machine-readable error codes
│   ├── http/       response envelope, asyncHandler
│   ├── logger/     Pino with PII redaction
│   ├── middleware/ context, validation, rate limit, 404, error handler
│   ├── qr/         zero-dependency QR encoder + SVG renderer
│   └── security/   Aadhaar input guard, roles, passwords, tokens
├── modules/      feature modules — the only place routes are defined
│   ├── audit/        append-only trail of privileged actions
│   ├── auth/         OTP, password login, token rotation, sessions
│   ├── communities/  creation, approval, leaders, join codes, membership
│   ├── health/
│   └── users/        profile, directory, role and status administration
├── scripts/      one-off operational scripts (super-admin bootstrap)
├── shared/       schemas and types reused across modules
├── app.ts        Express wiring only — no I/O, so tests can mount it directly
└── server.ts     process lifecycle: connect, listen, graceful shutdown
```

Larger modules split beyond the seven files rather than growing one long file —
`auth` keeps `otp.service.ts` and `token.service.ts` separate from `auth.service.ts`,
and each model gets its own file. The layering rule is unchanged.

## Response envelope

Every response, success or failure, has one shape. Clients branch on `error.code`,
never on the message text.

```jsonc
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "…", "messageHi": "…" } }
```

Every response also carries `x-request-id`, which appears on every log line for
that request.

## Conventions

- Async route handlers must be wrapped in `asyncHandler` — Express 4 does not
  forward rejected promises to the error middleware.
- Throw `AppError`; anything else reaching the error handler is treated as an
  unexpected 500 and logged as one.
- Aadhaar numbers are rejected at the input layer for every mutating request. A
  value that reached the database is also in the backups, the logs and the replicas.
- New sensitive request fields must be added to `REDACT_PATHS` in `core/logger`.

## Known gaps

- **No SMS provider.** OTPs are logged locally and returned as `devCode` outside
  production. A DLT-registered Indian provider goes behind an `SmsSender` interface;
  register the templates early, approval takes days.
- **In-process rate limiting.** Correct for a single instance. Before scaling
  horizontally this must move to a shared store, or the effective limit becomes
  `max × instanceCount`.
- **No TOTP for staff yet.** ARCHITECTURE.md §3.1 requires it for accounts that can
  read every record.
- **Audit log is best-effort.** `auditService.record` swallows its own failures so a
  dropped row can never fail the action it describes. Correct for an operational
  trail; if it becomes a compliance trail, write it in the same transaction instead.
  Append-only is enforced by ODM hooks — the deployment should also grant the app's
  database role no `update`/`remove` on `audit_logs`.
- **Join-code preview requires a session.** `/communities/lookup/:code` sits behind
  `authenticate`, so a QR scan leads to sign-in before the community is shown. That
  is deliberate (it blocks code enumeration by anonymous callers); the Flutter
  router parks the deep link and replays it after sign-in.
- **No SMS provider, so invites are not delivered.** `core/sms` defines the
  `SmsSender` seam and ships a logging implementation; Indian transactional SMS
  needs a DLT-registered sender ID and pre-approved templates, which is paperwork
  measured in days. Until one is connected, `POST /:id/invites` returns the link
  in the clear so the leader can forward it on WhatsApp — which is how most
  invites will travel regardless. Swapping in a provider is one class and one line.
- **Single-community membership.** `communityId` lives on the user document, so a
  person belongs to exactly one community. ARCHITECTURE.md §1 calls for `role` and
  membership to move onto a `memberships` join so one person can hold different
  roles in several communities; that migration is deliberately deferred, and this
  field is the thing it will replace.
