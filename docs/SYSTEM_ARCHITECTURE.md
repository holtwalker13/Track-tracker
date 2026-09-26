# System Architecture (as implemented)

This document describes the **Track Tracker / SAP** application as it exists in the repository today—not an idealized target architecture. For product layering notes, see also [ARCHITECTURE.md](./ARCHITECTURE.md).

## Stack

| Layer | Technology |
|--------|------------|
| Runtime | Node.js |
| Web framework | Next.js 15 App Router (React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`src/app/globals.css` CSS variables) |
| Database | PostgreSQL via Prisma 5 |
| Auth | HTTP-only cookie `sap_session` (JWT HS256, 7-day TTL) |
| Validation | Zod (select API payloads) |
| Charts | Recharts |

Local dev: Docker Compose Postgres + seed (`docker-compose.yml`). Production: Railway Postgres (`docs/RAILWAY.md`).

## Multi-tenant domain model

```
Organization
  ├── OrganizationSettings (logo, leaderboard name policy)
  ├── District (optional)
  └── School
        ├── SchoolYear (label, dates, isCurrent)
        ├── Class (+ optional CoachProfile coachId, period, gradeLevel)
        │     └── ClassEnrollment → StudentProfile
        ├── StudentProfile (permanent athlete record)
        │     ├── StudentEnrollment (gradeLevel per SchoolYear)
        │     ├── PerformanceResult
        │     └── WorkoutSession / WorkoutAssignment
        ├── TestingSession
        ├── SchoolKpiTarget / SchoolHiddenKpi
        ├── SchoolHiddenLift
        └── WorkoutTemplate → WorkoutAssignment
```

**Roster grouping:** The product emphasizes **graduating class year** (`gradeLevel` on `StudentEnrollment`, UI labels via `src/lib/grades.ts`) rather than a fixed “grade 6–12” ladder. PE **classes** are separate (`Class` + `ClassEnrollment`) and often keyed by period/hour.

**Activities (exercises/tests):** Global catalog in `Activity` + `ActivityCategory`, plus school-scoped custom KPIs/lifts (`Activity.schoolId`). Scoring uses `scoringDirection`: `HIGHER_BETTER` | `LOWER_BETTER`.

## Authentication flow

1. User submits credentials on `/login` (`src/app/login/actions.ts`) or `POST /api/auth/login`.
2. Server verifies `User.passwordHash` (bcrypt), loads role and profile links.
3. JWT payload: `userId`, `role`, optional `schoolId` (coach/admin context), optional `studentId`.
4. Cookie set via `src/lib/auth/cookie.ts` + `createSession` / route handler response.

**Session resolution:**

- `getSession()` — JWT verify only (no DB).
- `requireSession(roles?)` — JWT + DB user exists; resolves `schoolId` from coach/student profile (admin uses session-selected school).
- `requireSchoolSession()` — coach/admin pages; redirects to `/admin` or `/login` if no school.

**Middleware:** `src/middleware.ts` is intentionally a no-op (auth runs in Node route handlers / RSC to avoid Edge session issues on Railway).

**Admin school context:** `POST /api/admin/switch-school` rewrites JWT `schoolId` so admins can operate as a chosen school.

## Authorization model

| Role | School scope | Typical access |
|------|--------------|----------------|
| ADMIN | Selected `schoolId` in session | All coach features + `/admin` school setup |
| COACH | `CoachProfile.schoolId` | Same-school students, sessions, KPIs, workouts |
| STUDENT | `StudentProfile.schoolId` | Own profile, workouts, anonymized/privacy-aware leaderboards |

**Server-side patterns:**

- API routes call `requireSession([...])` and compare `resource.schoolId === session.schoolId`.
- Student workout APIs enforce `workoutSession.studentId === session.studentId`.
- Student leaderboards validate `classId` is in the student’s enrolled classes.
- Compare queries reject opponents outside the viewer’s school.

**Helpers (not yet wired everywhere):** `src/lib/auth/permissions.ts` (`canAccessStudentRecord`, `leaderboardDisplayName`).

**Leaderboard privacy:** `StudentProfile.nameHidden`, org setting `showNamesOnLeaderboardsForStudents`, and `leaderboardEntryName()` in `src/lib/queries/coach.ts`.

## Major routes (UI)

### Public / auth

| Path | Purpose |
|------|---------|
| `/` | Redirect by role |
| `/login` | Login + tenant cards |

### Admin

| Path | Purpose |
|------|---------|
| `/admin` | Pick school, create class/student, roster import |

### Coach (`src/app/coach/*`)

| Path | Purpose |
|------|---------|
| `/coach` | Dashboard KPIs |
| `/coach/leaderboards` | Multi-activity leaderboard grid |
| `/coach/students` | Roster table, filters, CSV import |
| `/coach/students/[id]` | Athlete profile (charts, attempt log, marks window) |
| `/coach/testing` | Session list, start session |
| `/coach/testing/[sessionId]` | Live testing studio (grid + mobile studio) |
| `/coach/testing/[sessionId]/station` | Kiosk station (client POST to API) |
| `/coach/programs` | Workout templates & assignments |
| `/coach/programs/logs` | Daily workout log review |
| `/coach/programs/session/[sessionId]` | Coach edit student workout session |
| `/coach/classes` | PE class list |
| `/coach/classes/[id]` | Class roster editor |
| `/coach/analytics` | Grade/gender analytics, box scores |
| `/coach/benchmarks` | KPI target bands + historical marks import UI |
| `/coach/compare` | Head-to-head / lineup compare |

### Student (`src/app/student/*`)

| Path | Purpose |
|------|---------|
| `/student` | Dashboard (scorecard, radar, ranks, sprint potential) |
| `/student/workout` | Log assigned workout sets |
| `/student/performance` | Latest results, attempt schedule, marks window |
| `/student/progress` | Per-activity progress chart |
| `/student/leaderboards` | Leaderboards (class-scoped) |
| `/student/compare` | Compare vs peers |
| `/student/projection` | Sprint potential / peer leaders |

Navigation config: `src/lib/navigation.ts` → `TopNav` in `AppShell`.

## API surface (`src/app/api/*`)

Grouped by domain:

- **Auth:** `auth/login`, `auth/logout`
- **Admin:** `admin/switch-school`
- **Students:** `students`, `students/[id]`, `students/visibility`, `roster/import`
- **Classes:** `classes`, `classes/[id]`, `classes/[id]/enroll`, `classes/import`
- **Testing:** `testing/sessions`, `testing/sessions/[id]`, `testing/save`, `testing/session-meta`
- **KPI / lifts:** `kpi-targets`, `lifts`
- **Marks:** `marks/template`, `marks/import`
- **Workouts:** `workouts/templates`, `workouts/templates/[id]`, `workouts/assignments`, `workouts/generate`, `workouts/today`, `workouts/sessions/[id]/sets`, `workouts/sessions/[id]/complete`, `workouts/logs/export`

## Layering in code

| Location | Responsibility |
|----------|----------------|
| `prisma/schema.prisma` | Schema, indexes, relations |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/services/*` | Business rules: save results, PRs, benchmarks, projections, workouts |
| `src/lib/queries/*` | Read models for pages (dashboards, leaderboards, roster columns) |
| `src/lib/format.ts` | Units, `formatActivityValue`, `isBetter` / `bestOf` |
| `src/lib/constants.ts` | Enums, live session window helpers |
| `src/components/*` | UI by feature (testing, athletes, workouts, charts, ui primitives) |
| `src/app/**/page.tsx` | Server Components: auth gate + data fetch + composition |

## Performance data flow (critical path)

### Live testing (coach grid)

```
Coach opens /coach/testing/[sessionId]
  → load TestingSession + TestingSessionStudent + activities
  → load existing PerformanceResult rows for session/activity
  → LiveTestingGrid blur/autosave
        POST /api/testing/save
          → saveAttemptResults() in src/lib/services/results.ts
               • deleteMany prior rows for (student, activity, session)
               • insert one row per attempt; mark isBestAttempt
               • PR via calculatePersonalRecord + getPreviousBest
  → Optional celebration via testing-celebration.ts (period board hits)
```

**Corrections (manual):** `correctResult()` supersedes a row (`status: SUPERSEDED`, new row with `supersedesId`). Live grid re-save **replaces** session-scoped attempts without supersede chain (by design for that entry mode).

### Historical / import

```
Coach benchmarks UI or CSV
  → POST /api/marks/import
  → src/lib/services/import-marks.ts
  → PerformanceResult rows (entryMethod IMPORT)
```

### Workout → performance

```
Student completes workout
  → POST /api/workouts/sessions/[id]/complete
  → workout-complete.ts + workout-performance-sync.ts
  → may write PerformanceResult (entryMethod WORKOUT)
```

### Read paths

| Consumer | Query / service |
|----------|------------------|
| Roster marks | `getClassRoster` — latest best per activity slug |
| Athlete profile | `attempt-log.ts`, `marks-window.ts`, `student.ts` |
| Leaderboards | `getLeaderboard` / `getLeaderboardGrid` — period window + best per student |
| KPI / sprint potential | `kpi.ts` + `SchoolKpiTarget` bands |
| Percentiles | `services/benchmarks.ts` + `BenchmarkValue` |
| Projections | `services/projection.ts` |

## KPI and leaderboard calculation ownership

| Metric | Authoritative implementation |
|--------|------------------------------|
| Best of attempts | `pickBestAttempt` → `bestOf` (`format.ts`) |
| Personal record | `calculatePersonalRecord` (`performance.ts`) |
| Rank ordering | `rankResults` (`services/leaderboard.ts`) |
| Leaderboard rows | `getLeaderboard` (`queries/coach.ts`) — period filter + dedupe per student |
| Percentile vs norms | `services/benchmarks.ts` |
| Category / box scores | `services/category-score.ts`, `queries/box-score.ts` |
| Sprint potential | `queries/kpi.ts` (KPI targets + flying-10 mapping) |
| Relative strength | `calculateRelativeStrength` / stored on result when bodyweight captured |

**Known duplication risk:** `getLeaderboard` vs `getStudentLeaderboard` (`leaderboard-student.ts`) vs inline ranking in dashboard widgets—same rules but separate query code paths.

## Shared UI components

Primitives: `src/components/ui/` — `Card`, filter pills, gender toggle, period pills, rank scope, `CoachModal`, `LeaderboardFilterModal`.

Layout: `app-shell.tsx`, `top-nav.tsx`, `profile-banner.tsx`.

Feature-heavy components (see audit for size): `live-testing-studio.tsx`, `kpi-targets-editor.tsx`, `workout-programs-panel.tsx`.

## Global state

No Redux/Zustand. State is:

- **URL search params** — filters (grade, gender, class, period, activity).
- **Server Components** — fetch per request.
- **Client islands** — local `useState` for forms, live grid, modals; session identity from cookie on API calls.

**Selected school (admin):** JWT `schoolId`. **Current school year:** DB `SchoolYear.isCurrent`. **Class/student context:** route params + query strings.

## Environment configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `SESSION_SECRET` | JWT signing (16+ chars) |
| `APP_MODE` | Production hints |

See `.env.example`.

## Testing & quality gates

- **Lint:** `npm run lint` (ESLint 9 + eslint-config-next)
- **Build:** `npm run build` (Prisma generate + Next build)
- **Automated tests:** Minimal; high-risk math covered by targeted unit tests under `src/lib/services/*.test.ts` (added during stabilization)

## Related docs

- [DOMAIN_TERMINOLOGY.md](./DOMAIN_TERMINOLOGY.md) — canonical naming
- [APP_AUDIT.md](./APP_AUDIT.md) — findings and priorities
- [WEIGHT_LIFTING.md](./WEIGHT_LIFTING.md) — lifting / workout domain notes
