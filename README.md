# Samuday Setu

Community, hierarchy and membership platform for samajs, political sangathans,
RWAs and alumni networks.

| App | Path | Stack |
|---|---|---|
| API | [`backend/`](./backend) | Node 20+ · Express · TypeScript (strict) · MongoDB · Redis |
| Mobile | [`samudaysetu/`](./samudaysetu) | Flutter · Riverpod · go_router · Dio · Drift |
| Admin web | [`admin/`](./admin) | React 18 · TypeScript · Vite · TanStack Query |

Design docs: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`SAMUDAY_SETU_STRATEGY.md`](./SAMUDAY_SETU_STRATEGY.md)

## Run it

```bash
# 1. API — needs MongoDB and Redis running locally
cd backend && cp .env.example .env && npm install && npm run dev

# 2. Admin web
cd admin && cp .env.example .env && npm install && npm run dev

# 3. Mobile
cd samudaysetu && flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1
```

Health check: <http://localhost:4000/api/v1/health/ready>

## The three rules that everything else depends on

1. **`role` is not a field on `User`.** It lives on `Membership` — the join between a
   user and a community. One person can be a MEMBER here and a LEADER there.
2. **Tenant isolation fails closed.** A query with no tenant in context throws; it
   never returns every tenant's rows. Enforced by a Mongoose plugin, not by discipline.
3. **Aadhaar is rejected at the input layer**, never stored and then cleaned.

## Build order

See ARCHITECTURE.md §9. Next up: the cross-tenant leak test suite, then OTP auth.
