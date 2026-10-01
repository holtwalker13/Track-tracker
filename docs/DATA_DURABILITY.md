# Data durability, chronology & volume (beta readiness)

This document is the source of truth for how athlete performance data is protected
as coaches and students begin beta testing.

## Source of truth

| Data | System of record | Survives app update? |
|------|------------------|----------------------|
| Testing marks, workout-synced marks, PRs | **PostgreSQL** (`PerformanceResult`) | Yes — not stored in the browser |
| Workout set logs | **PostgreSQL** (`WorkoutSetLog`) | Yes |
| Session / assignment structure | **PostgreSQL** | Yes |
| Unsaved live-grid cells | React state only | No — blur/save before leaving |

Pulling new code or redeploying **never** copies or clears Postgres. The database
is a separate Railway (or Docker volume) service. Treat it as siloed infrastructure.

## Two clocks (chronology)

Progress only makes sense in order. Every mark carries:

1. **`testingDate`** — coach/calendar day of the test or workout (event time).
2. **`recordedAt`** — server wall-clock when that row was first written (entry time).
   Corrections create a **new** row; the old row stays with `status = SUPERSEDED`
   and its original `recordedAt`.

Attempt logs and progress charts order by `testingDate`, then `recordedAt`.
Same-day jumps of 10 → 11 → 12 feet stay ordered even when they share a calendar day.

Workout completion also sets `WorkoutSession.completedAt` (server time).
Set slots keep `WorkoutSetLog.createdAt` (first log) and `updatedAt` (last edit).

## Write rules (never silent wipe)

| Action | Behavior |
|--------|----------|
| Live testing re-save | Unchanged attempts kept; changed/removed attempts → `SUPERSEDED`, new rows created |
| Workout re-complete / sync | Same value → in-place metadata refresh; new value → supersede + create |
| Delete testing session **with** marks | **Soft-archive** (`archivedAt`); marks preserved |
| Delete empty testing session | Hard delete OK |
| Delete custom KPI/lift with marks | **Blocked (HTTP 409)** — hide instead |
| Delete workout assignment | Synced marks superseded first, then assignment cascades |
| Manual correction | Old row superseded; `supersedesId` links the replacement |

An append-only **`PerformanceAuditEvent`** table records creates, supersedes,
session archives, and testing-date shifts. App code must not update or delete
audit rows.

## Deploy / schema safety

- Boots use **`prisma migrate deploy`** only — **never** `db push --accept-data-loss`.
- `FORCE_SEED=1` is **blocked** when `APP_MODE=production`.
- Migrations are additive (new columns/indexes/tables). Destructive changes require
  a deliberate, reviewed migration and a backup restore drill first.

### One-time baseline (existing Railway DB from older `db push` boots)

If migrate deploy complains that the init migration cannot create tables that
already exist:

```bash
# In a one-off Railway shell / local tunnel against prod DATABASE_URL:
npx prisma migrate resolve --applied 20251001000000_init
npx prisma migrate deploy
```

That marks the historical schema as applied, then runs
`20261001020000_data_durability_beta` (recordedAt, audit table, indexes, etc.).

## Backups (required before real beta schools)

### Railway Postgres

1. Open the Postgres service → enable **automatic backups** / snapshots if available
   on your plan (or use a scheduled `pg_dump` worker).
2. Before any intentional wipe or major migration, take a manual backup.
3. Practice restore into a **staging** database once before beta week.

### Local Docker

```bash
# Dump
docker compose exec -T postgres pg_dump -U sap -d sap -Fc > backup-$(date +%Y%m%d).dump

# Restore into a fresh volume (destructive to that volume)
docker compose exec -T postgres pg_restore -U sap -d sap --clean --if-exists < backup-YYYYMMDD.dump
```

## Volume readiness

Indexes added for beta load:

- `PerformanceResult (studentId, testingDate)`, `(studentId, recordedAt)`,
  `(schoolId, status, testingDate)`
- `Class(schoolId)`, `Class(coachId)`, `CoachProfile(schoolId)`,
  `ClassEnrollment(classId)`
- `TestingSessionStudent(studentId)`, `TestingSessionActivity(activityId)`,
  `TestingSession(schoolId, archivedAt)`

Leaderboards and progress still aggregate in application code; as roster size
grows past a few hundred athletes per school, prefer period filters and
pagination (follow-up). Current indexes keep per-student chronology and
school-scoped queries from full-scanning.

## What coaches / students should know

- Data entered and saved is in the school database, not on the phone.
- Editing a mark keeps the previous value in history (superseded).
- Deleting a testing session that already has marks hides the session; it does
  not erase athlete performance.
- Do not set `FORCE_SEED` on the production Railway service.
