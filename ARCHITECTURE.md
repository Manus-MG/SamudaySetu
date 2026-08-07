# Samuday Setu — Backend & App Architecture

**Stack:** Node + Express + **TypeScript** · MongoDB (Mongoose) · Redis · React (admin web) · **Flutter** (mobile)
**Tenancy:** Shared DB + enforced `tenantId`, fail-closed
**Team:** 1–2 devs, MVP in 3 months → *scope discipline matters more than cleverness. See §8.*

---

## 1. The one decision everything else hangs off

> ### ❌ `role` is NOT a field on `User`.
> ### ✅ `role` lives on `Membership` — the join between a user and a community.

**Why this is non-negotiable for your product:**

- One person is a `MEMBER` of the Gupta Samaj, a `BOOTH_PRAMUKH` under a BJP leader's community, and the `SECRETARY` of their RWA. **All at the same time.**
- If `user.role = 'admin'` exists anywhere in your codebase, you have already lost. That person becomes admin *everywhere*.
- Your strategy doc says a cross-tenant leak between rival parties is company-ending. This schema decision is where that risk is actually won or lost.

```
User (global identity: phone, name, language)
  └── Membership (userId + tenantId + roleKey + hierarchyNodeId + status)   ← roles live here
        └── MemberProfile (tenant-scoped PII: address, samaj, constituency)
```

**Corollary:** `MemberProfile` is tenant-scoped, not global. The same person can be in two communities and the samaj one holds gotra while the RWA one holds flat number. This also means **deleting a tenant deletes their members' profile data cleanly** — a DPDP erasure requirement you get for free.

---

## 2. Roles

### 2.1 Platform roles (Samuday Setu staff)

| Role key | Purpose | PII access |
|---|---|---|
| `SUPER_ADMIN` | Break-glass only. Mandatory TOTP. Every action audited and alerted. | ❌ none by default |
| `PLATFORM_OPS` | Tenant provisioning, plan changes, feature flags | ❌ none |
| `SUPPORT_AGENT` | Assists tenants | ⚠️ only via time-boxed, owner-approved impersonation |
| `COMPLIANCE_OFFICER` | DPDP data-principal requests, erasure, breach handling, audit-log read | ⚠️ scoped to a specific request |
| `BILLING_ADMIN` | Invoices, subscriptions | ❌ none |

**The rule that makes you sellable to rival parties:**

> **No platform role can read member PII by default.** Support access requires the tenant owner to grant a session, is capped (e.g. 60 minutes), shows a persistent banner inside the tenant's dashboard while active, and writes an audit entry per record viewed.

Build this in week 2, not year 2. It is your entire answer when a party's IT cell asks "what stops your employees reading our voter list?"

### 2.2 Tenant roles — split **role** from **designation**

This is the second architectural decision that pays off later.

| Concept | What it is | Example |
|---|---|---|
| **Role** (`roleKey`) | A bundle of *permissions*. Small, fixed set. | `ADMIN`, `LEADER`, `MEMBER` |
| **Designation** | A tenant-configurable *title* attached to a hierarchy level. Cosmetic + scope anchor. | "Zila Adhyaksh", "Booth Pramukh", "Secretary" |

**Why split them?** A samaj has *Panna Pramukhs*. An RWA has a *Treasurer*. An alumni network has a *Batch Coordinator*. If you hardcode Sangathan titles as roles, you can never sell to RWAs and alumni networks — which your strategy doc says you *need* for diversification and PR cover.

**Roles (fixed, 8 total):**

| Role key | Description |
|---|---|
| `OWNER` | The paying leader. Exactly one per tenant. Only role that can transfer ownership and manage billing. |
| `ADMIN` | Everything except billing and ownership transfer. |
| `MODERATOR` | Approve/reject join requests, moderate content, handle reports. |
| `MANAGER` | Runs a functional area — events, seva, verification. Scoped by module. |
| `LEADER` | Any hierarchy office-bearer. Permissions scoped to their **subtree**. This is where 95% of your Pramukhs sit. |
| `MEMBER` | Ordinary Sadasya. Sees own profile + tenant-public directory. |
| `AUDITOR` | Read-only. For samaj trustees / party observers. |
| `PENDING` | Applied, not yet approved. Can see almost nothing. |

**Designations — seeded templates per tenant type:**

```
SAMAJ / POLITICAL template          RWA template              ALUMNI template
 L0  Rashtriya Adhyaksh              L0  President             L0  President
 L1  Prant Pramukh                   L1  Secretary             L1  Chapter Head
 L2  Zila Adhyaksh                   L2  Treasurer             L2  Batch Coordinator
 L3  Lok Sabha Pramukh               L3  Block Representative  L3  Alumnus
 L4  Vidhan Sabha Pramukh            L4  Resident
 L5  Mandal Pramukh
 L6  Booth Pramukh
 L7  Panna Pramukh
 L8  Sadasya
```

Each level carries a `spanCap` (max direct reports) — this is what forces the tree to widen instead of one person hoarding 5,000 shallow contacts, per the strategy doc.

### 2.3 Permissions = `action` + `scope`

Don't build a role-name `if/else` ladder. Build **RBAC with a scope dimension**:

```ts
type Permission =
  | 'member:read'   | 'member:update' | 'member:approve' | 'member:export'
  | 'hierarchy:read'| 'hierarchy:assign'
  | 'broadcast:send'| 'event:manage'  | 'seva:manage'
  | 'role:assign'   | 'tenant:settings' | 'billing:manage' | 'audit:read';

type Scope = 'SELF' | 'NODE' | 'SUBTREE' | 'TENANT';
```

A role grants pairs: `{ permission: 'member:read', scope: 'SUBTREE' }`

| | OWNER | ADMIN | MODERATOR | LEADER | MEMBER | AUDITOR |
|---|---|---|---|---|---|---|
| `member:read` | TENANT | TENANT | TENANT | **SUBTREE** | SELF | TENANT |
| `member:approve` | TENANT | TENANT | TENANT | SUBTREE | — | — |
| `member:export` | TENANT | ⚠️ capped | — | — | — | — |
| `hierarchy:assign` | TENANT | TENANT | — | SUBTREE | — | — |
| `broadcast:send` | TENANT | TENANT | — | SUBTREE | — | — |
| `role:assign` | TENANT | ⚠️ below own level | — | — | — | — |
| `billing:manage` | ✅ | — | — | — | — | — |
| `audit:read` | TENANT | TENANT | — | — | — | TENANT |

**Two guardrails to build in from day 1:**

- **`member:export` is the highest-risk permission in the system.** Cap volume, watermark every export with the requester's ID, rate-limit hard, and alert on any export over N rows. Per the strategy doc, the most likely way your database walks out the door is a leader bulk-exporting their subtree the day they switch parties.
- **No role may grant a role at or above its own level.** Prevents privilege escalation via self-promotion.

**Middleware shape:**

```ts
router.get('/members',
  authenticate,              // → sets userId, deviceId
  resolveTenant,             // → reads X-Tenant-Id, loads membership (Redis-cached)
  requirePermission('member:read'),  // → attaches req.scopeFilter
  memberController.list      // → repository merges req.scopeFilter into the query
);
```

`requirePermission` resolves the scope into a Mongo filter fragment:

| Scope | Filter fragment |
|---|---|
| `TENANT` | `{}` (tenantId already injected globally) |
| `SUBTREE` | `{ 'node.ancestors': myNodeId }` |
| `NODE` | `{ nodeId: myNodeId }` |
| `SELF` | `{ userId: me }` |

---

## 3. Auth flow

### 3.1 Design choices and why

- **Phone + OTP is the only login for members. No passwords.** Your users are in rural UP/Bihar on shared devices. Passwords mean a support burden you cannot staff at 2 people, plus password reuse and reset-flow attacks. OTP is what this demographic already expects from every app they use.
- **Email + password + mandatory TOTP** only for `OWNER`/`ADMIN` on the React web dashboard. These accounts control lakhs of records; they get real MFA.
- **One entry point.** Same screen for login and signup: enter phone → OTP → if the phone is new, continue to onboarding; if known, go home. Do not make a low-literacy user choose between "Login" and "Sign up" buttons.

### 3.2 Token strategy

| Token | Lifetime | Storage | Contents |
|---|---|---|---|
| **Access JWT** | 15 min | memory (Flutter) / httpOnly cookie (web) | `sub` (userId), `did` (deviceId), `jti` — **no roles, no tenant** |
| **Refresh token** | 60 day sliding | `flutter_secure_storage` / httpOnly cookie | opaque 256-bit random; **SHA-256 hashed in DB**, never stored plaintext |

**Why roles are deliberately NOT in the JWT:** a leader switches parties, or is removed for misconduct, and you need their access gone *now* — not in 15 minutes. Roles resolve per-request from the `memberships` collection via a 60-second Redis cache. Revocation = cache bust. This is worth the lookup.

**Refresh rotation with reuse detection:** each refresh is single-use and issues a new one. If an already-used refresh token is presented, treat it as theft — revoke the entire device token family and force re-login.

### 3.3 OTP hardening (build this on day 1, not after the bill arrives)

- 6 digits, 5-minute TTL, **stored hashed in Redis**, max 5 verify attempts then lock the phone for 30 min.
- Rate limits: **3 OTPs per phone/hour**, 10 per IP/hour, 30 per device/day.
- OTP flooding is a direct financial attack — every SMS costs you money. Unthrottled OTP is how small Indian startups get a ₹4 lakh SMS bill in a weekend.
- Use a DLT-registered Indian SMS provider (TRAI requirement) with pre-approved templates. Register templates *early* — approval takes days.
- Add **WhatsApp OTP** as a fallback channel; cheaper and more reliable in low-signal areas.

---

## 4. Signup form fields — safe set

**Principle: progressive disclosure.** Ask 4 fields at signup. Everything else is optional and *incentivised* ("complete your profile to unlock the verified badge / matrimony / business directory"). Long forms are where rural signups die.

### Screen 0 — Entry
| Field | Type | Validation |
|---|---|---|
| `phone` | string | E.164, `+91`, 10 digits, must start `6-9` |
| `otp` | string | 6 digits |

### Screen 1 — Identity ✅ *required, 3 fields + consent*
| Field | Type | Notes |
|---|---|---|
| `fullName` | string | 2–80 chars. **Allow Devanagari** (`ऀ-ॿ`) + Latin. Do not force English. |
| `gender` | enum | `MALE` / `FEMALE` / `OTHER` / `PREFER_NOT_TO_SAY` |
| `preferredLanguage` | enum | `hi` (default), `en`, `bho`, `mai`, `ur` |
| `consentTerms` | boolean | **Separate checkbox, unticked by default** |
| `consentPrivacy` | boolean | **Separate checkbox, unticked by default** |

> ⚠️ **DPDP requires unbundled, specific consent.** One combined "I agree to terms and privacy policy" checkbox is not valid consent. Two checkboxes, both unticked, notice available in the user's chosen language. Write every acceptance to the `consents` ledger with policy version, timestamp, IP and locale.

### Screen 2 — Community
| Field | Notes |
|---|---|
| `inviteCode` | 8-char, from a deep link or shared by the referrer |
| `referrerMembershipId` | auto-filled from the invite — **this is your hierarchy edge** |
| — | Creates a `JoinRequest`; admin approves. Never auto-join. |

### Screen 3 — Location ✅ *this is your political geography, all of it safe*
| Field | Notes |
|---|---|
| `state` → `district` → `tehsil/block` → `villageOrWard` | Cascading dropdowns off your geo master data |
| `pincode` | 6 digits |
| `assemblyConstituency` | Dropdown auto-filtered by district; **user confirms** |
| `parliamentaryConstituency` | Derived from AC, don't ask |
| `pollingBoothId` | Optional. "Which school/building do you vote at?" |
| `addressLine` | Free text — **run the Aadhaar scanner on this field** |

### Screen 4 — Samaj identity ⭕ *optional, skippable*
`primarySamaj` (select + "Other") · `subCommunity` · `gotra` · `nativePlace` (mool nivas)

> Self-declared, optional, editable, **never a system-enforced gate** on joining. See §1.3 of the strategy doc.

### Screen 5 — Enrichment ⭕ *optional, incentivised*
| Field | Notes |
|---|---|
| `yearOfBirth` | **Year only, not full DOB** — data minimisation. Ask full DOB only if they opt into matrimony. |
| `photo` | Max 2MB, stripped of EXIF **including GPS** before storage |
| `occupationCategory` · `educationLevel` | Enums, not free text |
| `bloodGroup` | Low risk, high perceived value for the seva module |
| `epicNumber` | `^[A-Z]{3}[0-9]{7}$` — optional, unlocks the verified badge. **Your best constituency signal.** |

### 🚫 The NEVER list — enforce at the input layer

| Never collect | Why |
|---|---|
| **Aadhaar number / image / XML / masked Aadhaar** | Aadhaar Act s.38 — 3 yrs + ₹10L |
| Biometrics of any kind | Same |
| PAN, bank account, UPI ID | No business need; massive breach liability |
| Caste certificate documents | Document = official caste record. Self-declared text is fine; the certificate is not. |
| Health records, disability status | DPDP-sensitive, no product need |
| Religion | Unless the tenant *is* a religious org, and then optional only |
| Political party affiliation **at signup** | Only inside a political tenant, with separate explicit consent |
| Passwords for ordinary members | OTP only |

**Aadhaar rejection middleware — the single most important validator in your codebase:**

```
On every write, for every free-text field:
  1. regex scan for \b\d{4}\s?-?\d{4}\s?-?\d{4}\b
  2. if matched → run Verhoeff checksum
  3. if checksum passes → REJECT the request with a clear user-facing message
  4. log the attempt (field name + tenant, NOT the value)
```

Reject at input. Never store-then-clean — a value that touched your DB is in your backups, your logs and your replica set.

---

## 5. Collections

`★` = build for MVP · `○` = defer

| Collection | Scope | Notes |
|---|---|---|
| ★ `users` | global | Identity only: phone, name, gender, language, status. **No role, no tenant.** |
| ★ `devices` | global | Hashed refresh tokens, push token, platform, last seen |
| ★ `tenants` | global | Community: name, type, template, plan, settings, owner |
| ★ `memberships` | tenant | **The pivot.** `userId, tenantId, roleKey, nodeId, designationId, status` |
| ★ `hierarchyNodes` | tenant | The tree. Materialised path (see §6.2) |
| ★ `hierarchyLevels` | tenant | Level config: label(hi/en), spanCap, defaultRole |
| ★ `memberProfiles` | tenant | All PII: address, geo, samaj, enrichment |
| ★ `joinRequests` | tenant | Pending approvals |
| ★ `invites` | tenant | Code, referrer, expiry, usage cap |
| ★ `consents` | global | **Append-only ledger.** Never update, never delete. |
| ★ `auditLogs` | tenant | **Append-only.** Who read/changed what, when |
| ★ `geo_*` | global | `states`, `districts`, `constituencies`, `booths`, `pincodes` — read-only master data |
| ○ `events`, `eventRegistrations` | tenant | Phase 2 |
| ○ `sevaRequests` | tenant | Phase 2 — the issue heatmap source |
| ○ `broadcasts`, `broadcastRecipients` | tenant | Phase 2 |
| ○ `verifications` | tenant | Phase 2 |
| ○ `subscriptions`, `invoices` | global | Phase 2 |

**Index rule, no exceptions:**

> **Every compound index on a tenant-scoped collection leads with `tenantId`.**

```
memberships:     { tenantId, userId } unique
                 { tenantId, nodeId, status }
                 { tenantId, roleKey }
memberProfiles:  { tenantId, userId } unique
                 { tenantId, assemblyConstituencyId }
                 { tenantId, districtId, primarySamaj }
hierarchyNodes:  { tenantId, ancestors }        ← subtree queries
                 { tenantId, parentId }
users:           { phone } unique
auditLogs:       { tenantId, createdAt: -1 }, { tenantId, actorId, createdAt: -1 }
```

---

## 6. The two pieces of code that must be perfect

### 6.1 Tenant isolation — fail closed

Write this **first**. Test it **hardest**. Everything else is recoverable; this is not.

```
Request → authenticate → resolveTenant → AsyncLocalStorage.run({ userId, tenantId, membership })
                                              ↓
                          Mongoose global plugin: pre-hook on
                          find / findOne / update* / delete* / countDocuments / aggregate
                                              ↓
                          inject { tenantId } from ALS into every query
                                              ↓
                          if ALS has no tenantId  →  THROW. Do not query.
```

- **Fail closed, never open.** A missing tenant context must crash the request, not return everything.
- Only an explicit allowlist of global models (`users`, `devices`, `geo_*`, `consents`) skips injection.
- Never let a controller or service pass `tenantId` manually — a developer who forgets it once creates a leak. The plugin is the only path.
- **Write an integration test suite whose entire job is trying to break this.** Seed two tenants, then attempt every endpoint cross-tenant and assert 403/empty. Run it in CI on every commit. This test file is the most valuable thing in your repo.

### 6.2 Hierarchy — materialised path

The Mongo-idiomatic answer, and the right one here:

```js
{
  _id, tenantId, parentId, level: 6,
  ancestors: [rootId, prantId, zilaId, lsId, vsId, mandalId],  // ordered root → parent
  path: "/root/prant/zila/ls/vs/mandal/",
  memberCount: 412,        // denormalised, updated by job
  subtreeCount: 8934       // denormalised
}
```

| Query | Cost |
|---|---|
| Entire subtree under a node | `{ tenantId, ancestors: nodeId }` — **one indexed lookup** |
| Ancestor chain / breadcrumb | already in the document, zero queries |
| Direct children | `{ tenantId, parentId: nodeId }` |
| Depth | `ancestors.length` |

- **Denormalise `memberCount` and `subtreeCount`.** Your leader dashboard shows "8,934 members under you" on every load. That must not be a recursive count.
- **Design re-parenting on day 1.** When a leader leaves, their subtree gets reassigned. This rewrites `ancestors` for every descendant — do it as a background job with a progress record, not a synchronous request. Retrofitting this into a live tree is genuinely painful.
- Recompute counts via a scheduled job, not on every write. Eventual consistency is fine for a member count.

---

## 7. Folder structure

### 7.1 Backend — modular monolith

**Do not build microservices.** At 2 devs and 3 months, a modular monolith with clean boundaries ships and scales to lakhs of users. You can extract a service later if a module actually needs it.

```
src/
├── config/                 # env (zod-validated), constants, feature flags
├── core/
│   ├── context/            # AsyncLocalStorage tenant context   ← §6.1
│   ├── db/                 # connection, tenantScope plugin, base repository
│   ├── security/           # permissions matrix, scope resolver, aadhaarGuard
│   ├── middleware/         # authenticate, resolveTenant, requirePermission,
│   │                       #   rateLimit, errorHandler, requestId
│   ├── errors/             # AppError hierarchy, typed error codes
│   └── logger/             # pino, PII-redacting serialisers
├── modules/
│   ├── auth/               # otp, tokens, devices, sessions
│   ├── users/
│   ├── tenants/
│   ├── memberships/        # ← roles assigned here
│   ├── hierarchy/          # ← nodes, levels, designations, re-parenting
│   ├── profiles/
│   ├── geo/                # states, districts, constituencies, booths
│   ├── invites/
│   ├── consent/
│   └── audit/
├── jobs/                   # cron + (later) BullMQ workers
├── shared/                 # types, utils, zod schemas
├── app.ts
└── server.ts
```

**Each module is 6 files, same shape every time:**

```
module/
├── module.routes.ts        # express router, nothing else
├── module.controller.ts    # HTTP in / HTTP out. No business logic.
├── module.service.ts       # business logic. No mongoose. No req/res.
├── module.repository.ts    # the ONLY place mongoose is touched
├── module.model.ts         # mongoose schema
├── module.schema.ts        # zod — validates request AND infers TS types
└── module.types.ts
```

**Rules that keep this clean with a small team:**

- Controllers never touch Mongoose. Services never touch `req`/`res`. Repositories never contain business rules.
- A module may import another module's **service**, never its repository or model.
- **Zod schema is the single source of truth** — validate the request with it, and `z.infer` the TypeScript type from it. One definition, no drift.
- Every response goes through one envelope: `{ success, data, error: { code, message, messageHi } }`. Flutter parses one shape forever.

### 7.2 Flutter — feature-first clean architecture

```
lib/
├── core/
│   ├── network/            # dio, interceptors (auth refresh, retry, offline queue)
│   ├── storage/            # secure storage, drift database
│   ├── sync/               # outbox, sync engine, conflict resolution
│   ├── router/             # go_router + auth guards
│   ├── theme/
│   └── localization/       # hi (default) / en / bho
├── features/
│   ├── auth/
│   │   ├── data/           # dto, remote ds, local ds, repository impl
│   │   ├── domain/         # entity, repository interface, usecases
│   │   └── presentation/   # riverpod providers, screens, widgets
│   ├── onboarding/
│   ├── community/
│   ├── directory/
│   ├── hierarchy/
│   └── profile/
└── main.dart
```

**Packages:** `riverpod` (state) · `go_router` (nav) · `dio` (http) · `drift` (offline DB) · `freezed` + `json_serializable` (models) · `flutter_secure_storage` (tokens) · `cached_network_image`

**Non-negotiable constraints from the strategy doc:**

- **Offline-first.** A Panna Pramukh works on 2G in a courtyard with no signal. Every write goes to a local **outbox table** first, syncs in the background, and the UI reads from local. If it needs connectivity to be useful, it will not be used.
- **Sync protocol:** cursor-based on `updatedAt` + server-authoritative last-write-wins, with a conflict log the user can review. Don't attempt CRDTs.
- **Target device: ₹7,000 Android phone, 2GB RAM, Android 10.** Test on that, not on your emulator. Budget: **<40MB APK.**
- **Hindi is the default locale, English is the option.** Not the reverse.
- Refresh token in `flutter_secure_storage`. **Never** `SharedPreferences`.

---

## 8. What to actually build in 3 months (solo/2 devs)

You cannot build §5 in full. Here is the cut.

### ✅ BUILD — MVP

| # | Item | Weeks |
|---|---|---|
| 1 | **Tenant isolation layer + its test suite** | 1–2 |
| 2 | Auth: phone OTP, tokens, devices, rate limiting | 2–3 |
| 3 | Users, tenants, memberships, **4 roles only** (`OWNER`, `ADMIN`, `LEADER`, `MEMBER`) | 3–4 |
| 4 | **Hierarchy engine** — nodes, levels, assignment, subtree queries | 4–6 |
| 5 | Member profiles + geo master data (states → districts → ACs) | 6–7 |
| 6 | Invites, join requests, approval flow | 7–8 |
| 7 | Member directory: search, filter by node/AC/samaj | 8–9 |
| 8 | Consent ledger + audit log | 9 |
| 9 | Flutter app: onboarding, directory, my-hierarchy, profile | 5–11 |
| 10 | React admin dashboard: members, hierarchy tree, approvals | 9–12 |

### ❌ DEFER — Phase 2

Events · Seva/grievances · Broadcasts · Matrimony · Vyapar directory · Verification workflows · Analytics dashboards · Billing/payments · BullMQ *(use plain `node-cron` for now)* · Push notifications at scale · Elasticsearch *(use MongoDB Atlas Search)*

### ⚠️ Never defer — these four are retrofit nightmares

1. **Tenant isolation** — retrofitting is a rewrite.
2. **Consent ledger** — you cannot reconstruct consent you never recorded. DPDP full compliance is due 13 May 2027.
3. **Audit log** — the day someone alleges misuse, this is your only defence.
4. **Hierarchy as materialised path** — converting a live adjacency-list tree is brutal.

Everything else can wait. These cannot.

---

## 9. Build order — start here Monday

1. Repo, TypeScript strict mode, ESLint, Prettier, Husky, zod-validated env config.
2. Mongo + Redis connections. Health endpoint.
3. **`core/context` + `core/db/tenantScope` plugin.** Fail-closed.
4. **The cross-tenant leak test suite.** Two seeded tenants, every endpoint attacked. Wire into CI.
5. `users` + `devices` + OTP auth + token rotation.
6. `tenants` + `memberships` + the permissions matrix + `requirePermission`.
7. `hierarchyLevels` + `hierarchyNodes` + subtree queries + span caps.
8. `aadhaarGuard` validator, applied globally.
9. `consents` + `auditLogs` middleware.
10. Geo master data import (states, districts, ACs for UP + Bihar).
11. Profiles, invites, join requests, directory.
12. Flutter onboarding against the real API.

> Steps 3 and 4 look like slow, unglamorous plumbing. They are the two weeks that decide whether you can sell this to a BJP leader and an AAP leader at the same time.

---

## 10. Open decisions for you

- **Soft delete or hard delete on member removal?** DPDP erasure says hard-delete the PII; your audit trail says keep the record. Answer: hard-delete `memberProfiles`, retain a tombstone in `memberships` with no PII.
- **Can one phone number hold two accounts?** (Shared family phones are common in rural UP/Bihar.) Recommendation: one account per phone, with *family member sub-profiles* under it. Two accounts per phone breaks OTP auth.
- **What happens to a community when the leader stops paying?** Read-only after 30 days, export window, then archive. Decide now — it's a contract term *and* a product behaviour.
- **Do leaders get member phone numbers?** This is the most requested and most dangerous feature. Recommendation: masked by default, in-app calling, reveal only with the member's consent and always audited.

---

*Companion document: [`SAMUDAY_SETU_STRATEGY.md`](./SAMUDAY_SETU_STRATEGY.md)*
