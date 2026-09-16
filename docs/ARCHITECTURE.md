# Student Athletic Performance Platform — Architecture

## Overview

Full-stack web application: **Next.js 15 (App Router)** + **TypeScript** + **Prisma** + **SQLite** (development; schema is PostgreSQL-compatible for production).

Product flow: **Measure → Compare → Improve → Compete → Project**.

## Layering

| Layer | Responsibility |
|--------|----------------|
| `prisma/schema.prisma` | Multi-tenant data model, indexes |
| `src/lib/services/*` | Benchmarks, rankings, PRs, projections (no UI logic) |
| `src/lib/auth/*` | Sessions, role checks, student anonymity |
| `src/app/api/*` | HTTP APIs for live testing autosave |
| `src/app/(coach)/*` | Coach UI |
| `src/app/(student)/*` | Student UI |
| `src/app/(auth)/*` | Login |

## Multi-tenant hierarchy

```
Organization
  └── District (optional)
        └── School
              ├── SchoolYear
              ├── Class → ClassEnrollment → StudentProfile
              ├── CoachProfile (User)
              └── StudentEnrollment (grade per school year)
```

Every `PerformanceResult` carries `school_id`, `organization_id`, `school_year_id`, and **grade at test time**.

## Authentication & permissions

- **Users** table with `role`: `ADMIN` | `COACH` | `STUDENT`.
- Cookie session (HTTP-only) signed with `SESSION_SECRET`.
- **Coach**: students in same `school_id` (via enrollments/classes).
- **Student**: only own `student_profile`; leaderboards use `anonymous_id` (e.g. `Student 1842`).
- **Admin**: architecture present; Phase 1 UI minimal.
- Cross-school analytics: aggregates only, never PII.

## School years & enrollments

One permanent `StudentProfile` per athlete. `StudentEnrollment` links `(student_id, school_year_id, grade_level)` — grade advances each year without duplicating students.

## Activities

Catalog-driven (`Activity` + `ActivityCategory`). Fields include `scoringDirection` (`HIGHER_BETTER` | `LOWER_BETTER`), units, validation bounds, flags for bodyweight/age/gender interpretation.

## Testing sessions

`TestingSession` → activities (`TestingSessionActivity`) and participants (`TestingSessionStudent` or implicit via grade/class).

**Live testing**: grid entry posts attempts; server computes best attempt, PR, percentiles, saves atomically.

**Student station**: sequential multi-activity entry for one student.

## Performance results

Stored per attempt with snapshot fields: `grade_level`, `age_at_test`, `weight_at_test`, `height_at_test`, `testing_date`, `entry_method`, `status` (`COMPLETED`, `ABSENT`, `INJURED`, `DNP`, `DQ`).

**Rule 7**: corrections create a new row and mark prior `SUPERSEDED` (audit via `supersedes_id`).

## Benchmark engine

- `BenchmarkDataset`: source metadata (name, year, population, region, methodology).
- `BenchmarkValue`: activity + optional age/grade + percentile columns (p25–p90).
- `calculatePercentile(value, benchmarkValues, scoringDirection)` — server-side only.
- Development data: **SYNTHETIC_DEV** — not real-world norms.

## Leaderboards

`calculateLeaderboard(filters)` queries best `is_best_attempt` results per student for scope (grade, school year, school, activity). Students see anonymized names; coaches see real names.

School records: all-time best per activity at school (respecting scoring direction).

## Projections

`calculateProjection()` interface:

- Inputs: activity, current grade/age/weight, current best, target grade.
- Outputs: conservative / typical / aggressive ranges from benchmark grade trajectories + optional student trend.
- Always labeled as estimates (UI copy enforced).

## Gamification

- PR detection: `calculatePersonalRecord()` on save.
- Achievements: rule-based on `StudentAchievement` (counts, PRs, percentile thresholds).
- No arbitrary Athletic Index in Phase 1; category scores from normalized percentiles per activity mapping.

## Performance & indexes

Indexes on `(student_id, activity_id)`, `(school_id, school_year_id, grade_level)`, `(activity_id, school_id, testing_date)`, `(testing_session_id)`.

## Phase 1 MVP screens

Coach: Dashboard, Students, Testing (sessions + live grid + station), Leaderboards, Analytics (basic), Benchmarks (read-only synthetic).

Student: Dashboard, My Performance, Progress, Leaderboards, Compare, Projection.

## Future (not Phase 1)

Billing, white-label UI, parent accounts, imports, wearables, district purchasing.
