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
│   └── security/   Aadhaar input guard
├── modules/      feature modules — the only place routes are defined
│   ├── auth/     (scaffolded, not implemented)
│   ├── health/
│   └── users/    (scaffolded, not implemented)
├── shared/       schemas and types reused across modules
├── app.ts        Express wiring only — no I/O, so tests can mount it directly
└── server.ts     process lifecycle: connect, listen, graceful shutdown
```

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

## Not yet wired

`auth` and `users` exist as empty file scaffolds. Uncomment their mounts in
`src/modules/index.ts` once they have routers.

The rate limiter uses an in-process store, which is correct for a single instance.
Before scaling horizontally it must move to a shared store, otherwise the effective
limit becomes `max × instanceCount`.
