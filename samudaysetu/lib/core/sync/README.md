# Sync engine

Offline-first is a hard constraint, not an enhancement (ARCHITECTURE.md §7.2).

- Every write goes to a local **outbox** table first; the UI reads from Drift, never
  from the network directly.
- Background sync is cursor-based on `updatedAt`, server-authoritative
  last-write-wins, with a conflict log the user can review. No CRDTs.

Planned files: `outbox_dao.dart` · `sync_engine.dart` · `conflict_log.dart`
