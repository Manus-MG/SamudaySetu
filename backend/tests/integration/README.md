# Cross-tenant isolation suite

> This is the most valuable test file in the repo (ARCHITECTURE.md §6.1).

Seed two tenants, then attack every endpoint cross-tenant and assert `403` or an
empty result. Wire it into CI so it runs on every commit. A regression here is
company-ending; a regression anywhere else is a bug.
