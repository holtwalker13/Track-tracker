# Domain Terminology

Canonical vocabulary for this codebase. **Do not rename database columns** without a migration plan; use this guide for UI copy, new code, and documentation.

## Hierarchy

| Canonical term | Also called in UI/code | Model / field |
|----------------|------------------------|---------------|
| **Organization** | tenant, school system | `Organization` |
| **District** | region | `District` (optional) |
| **School** | campus | `School` |
| **School year** | academic year | `SchoolYear` (`label`, `isCurrent`) |
| **Class** | period, hour, section | `Class` (PE grouping; not the same as graduating class) |
| **Graduating class / class year** | grade, class of | `StudentEnrollment.gradeLevel` (e.g. 2028); UI via `classYearLabel()` |

## People

| Canonical term | Variants in repo | Notes |
|----------------|------------------|-------|
| **Student** | athlete, player | Prefer **student** in new UI; `StudentProfile` is the record |
| **Coach** | teacher | `CoachProfile` linked to one `School` |
| **Admin** | app admin | Platform operator; may impersonate school via session |

`participationType`: `PE` vs `ATHLETE` — tracking mode, not role.

## Activities & testing

| Canonical term | Variants | Model |
|----------------|----------|-------|
| **Activity** | exercise, test, metric, KPI, lift | `Activity` |
| **Testing session** | test day, live session | `TestingSession` |
| **Attempt** | try, mark | Rows in `PerformanceResult` with `attemptNumber` |
| **Result / performance result** | mark, score | `PerformanceResult` |
| **Best attempt** | best mark | `isBestAttempt` within a session/activity |
| **Personal record (PR)** | PR | `isPersonalRecord` on best qualifying mark |
| **Benchmark** | norm, percentile dataset | `BenchmarkDataset` / `BenchmarkValue` |
| **KPI target** | medal band, school standard | `SchoolKpiTarget` |

**Workout-specific:** **Program/template** (`WorkoutTemplate`), **assignment** (`WorkoutAssignment`), **session** (`WorkoutSession`), **set log** (`WorkoutSetLog`).

## Scoring

| Term | Values |
|------|--------|
| **Scoring direction** | `HIGHER_BETTER` (distance, height, weight) vs `LOWER_BETTER` (time) |
| **Result status** | `COMPLETED`, `ABSENT`, `INJURED`, `DNP`, `DQ`, `SUPERSEDED` |
| **Entry method** | `LIVE_GRID`, `STUDENT_STATION`, `MANUAL`, `IMPORT`, `WORKOUT` |

## Leaderboards & privacy

| Term | Meaning |
|------|---------|
| **Anonymous ID** | `StudentProfile.anonymousId` — legacy display token |
| **Name hidden** | `nameHidden` — peers see “Hidden” on leaderboards; coaches see real name |
| **Leaderboard period** | week / month / year / season — `leaderboard-periods.ts` |
| **Rank scope** | school vs global (`getLeaderboard` `scope`) |

## Files that encode terminology

- Grades / class years: `src/lib/grades.ts`
- Gender labels: `src/lib/gender.ts`
- KPI metadata: `src/lib/kpi-targets.ts`
- Activity groups/icons: `src/lib/activity-groups.ts`, `activity-icons.tsx`

## Naming guidelines for new code

1. Use **student** over athlete in user-facing strings unless the screen is explicitly sports-branded.
2. Use **activity** in code; **test** is OK in coach “Testing” navigation only.
3. Use **performance result** in services; **mark** is OK in roster column headers.
4. Distinguish **class** (PE period) from **class year** (graduation cohort)—never overload “class” without context.
5. Prefer **session** for `TestingSession` and **workout session** for `WorkoutSession` to avoid ambiguity.
