# Samuday Setu — Admin dashboard

React 18 · TypeScript (strict) · Vite · React Router · TanStack Query · Axios

```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:5173 (proxies /api → localhost:4000)
```

Sign-in is email + password + mandatory TOTP for `OWNER`/`ADMIN` only. Tokens live in
httpOnly cookies — never `localStorage`. The active community is sent on every request
via the `X-Tenant-Id` header (`setActiveTenantId` in `src/api/client.ts`).
