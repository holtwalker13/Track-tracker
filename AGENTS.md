# Agent / developer context — Track Tracker (SAP)

Use this file as the **entry point** for AI agents and new contributors. Deep dives live in `docs/` (indexed below).

## What this app is

**Track Tracker** (repo/internal name **SAP**) is a multi-tenant school web app for athletic / PE performance:

**Measure → Compare → Improve → Compete → Project**

- **Measure:** live testing sessions (coach grid or student station), workout set logs, CSV/historical mark import
- **Compare:** head-to-head and lineup views (coach + student)
- **Improve:** progress charts, PRs, workout progression suggestions, KPI medal targets
- **Compete:** leaderboards (class/school scoped, privacy-aware)
- **Project:** sprint potential / projection from KPI marks

**Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind v4, Prisma 5, PostgreSQL, cookie JWT sessions.

**Local run:** `docker compose up --build` → http://localhost:3000 (see [README.md](./README.md) for demo logins).

## Canonical vocabulary

Read **[docs/DOMAIN_TERMINOLOGY.md](./docs/DOMAIN_TERMINOLOGY.md)** before renaming UI copy or adding features.

High-signal distinctions:

| Term | Meaning |
|------|---------|
| **Activity** | One test/metric/exercise (`Activity` model) — covers sprints, jumps, and **lifts** |
| **KPI** | Activity used in medal targets, KPI sets, leaderboards, testing |
| **Lift** | Strength-category activity; same DB row as a KPI, surfaced mainly under **Programs → Lift library** |
| **Class** | PE period/section (`Class`), **not** graduating cohort |
| **Class year** | Graduation year on enrollment (`gradeLevel`, e.g. 2028) |
| **Testing session** | Formal test day (`TestingSession` + `PerformanceResult`) |
| **Workout session** | Daily training log (`WorkoutSession` + `WorkoutSetLog`) |

**KPI library** = testing metrics (speed, power, agility, …) **+** strength lift library **+** school custom activities. Implemented in `src/lib/queries/kpi-library.ts`.

**Lift library** = strength category only. Implemented in `src/lib/queries/lifts.ts`. Workout programs use lifts with units `lb` or `reps` (`forWorkouts`).

Coach **KPIs** nav → `/coach/benchmarks` (KPI sets, ranked/unranked metrics, G/S/B targets).  
Coach **Programs** → `/coach/programs` and `/coach/programs/lifts` (templates, assignments, lift builder).

## Navigation (coach / student)

Defined in **`src/lib/navigation.ts`**.

| Coach nav label | Path | Primary UI |
|-----------------|------|------------|
| School | `/coach/school/*` | Roster, classes, coaches (hub tabs) |
| Testing | `/coach/testing` | Session list, live grid, station |
| Programs | `/coach/programs` | Templates, assign, auto-generate, logs |
| KPIs | `/coach/benchmarks` | `kpi-targets-editor.tsx`, import marks |
| Compete | `/coach/compete/*` | Leaderboards, compare (hub tabs) |

Also implemented (not always in top nav): `/coach/analytics`, `/coach/students/[id]`, `/coach/programs/lifts`, `/coach/programs/logs`.

Student nav: dashboard, accolades, log workout, performance, progress, leaderboards, compare, projection — see `STUDENT_NAV` in `navigation.ts`.

## Code layout (where to edit UI)

| Area | Location |
|------|----------|
| Pages (RSC, data fetch) | `src/app/coach/**`, `src/app/student/**`, `src/app/admin/**` |
| Feature components | `src/components/{testing,athletes,workouts,kpi,lifts,charts,ui,...}/` |
| Read models | `src/lib/queries/*` |
| Business rules / writes | `src/lib/services/*` |
| Auth | `src/lib/auth/*`, `src/middleware.ts` (no-op; auth in handlers/RSC) |
| Schema | `prisma/schema.prisma`, seed `prisma/seed.ts` |
| Design tokens | `src/app/globals.css` (CSS variables), Tailwind utility classes |

**UI patterns:** Server Components load data; client islands for modals, live testing grid, large forms. Filters often in **URL search params**. Shared chrome: `AppShell`, `TopNav`, `CoachClassScopeBar`, `CoachModal`.

**Large client components** (UI change hotspots): `live-testing-studio.tsx`, `kpi-targets-editor.tsx`, `workout-programs-panel.tsx`, `new-session-form.tsx`.

## Data model (sketch)

See **[docs/SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md)** for full detail.

```
Organization → School → SchoolYear, Class, StudentProfile, TestingSession,
  PerformanceResult, KpiSet, WorkoutTemplate, WorkoutAssignment, ...
```

Performance marks: `PerformanceResult` (attempts, best attempt, PR, status, entry method, supersede chain for corrections).

## Documentation index

| File | Use when |
|------|----------|
| [README.md](./README.md) | Setup, Docker, demo accounts, data sources |
| [docs/SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md) | Routes, APIs, data flows, layer responsibilities (**best technical map**) |
| [docs/DOMAIN_TERMINOLOGY.md](./docs/DOMAIN_TERMINOLOGY.md) | Naming for UI copy and new code |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Product layering / PRD-style overview |
| [docs/WEIGHT_LIFTING.md](./docs/WEIGHT_LIFTING.md) | Lifting vs track KPIs, workout phases, lift library behavior |
| [docs/DATA_DURABILITY.md](./docs/DATA_DURABILITY.md) | Marks persistence, supersede rules |
| [docs/APP_AUDIT.md](./docs/APP_AUDIT.md) | Historical audit, risks, duplication notes |
| [docs/IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) | Planned / phased work |
| [docs/DOCKER.md](./docs/DOCKER.md), [docs/RAILWAY.md](./docs/RAILWAY.md) | Deploy |

There is **no** `.cursor/rules` or skills folder in-repo today; this `AGENTS.md` is the intended agent entry point.

## Commands

```bash
npm run lint
npm run build
npm test          # if configured — see package.json
docker compose up --build
```

## UI work checklist

1. Confirm **role** (coach / student / admin) and **route** from `navigation.ts` or `src/app/**/page.tsx`.
2. Check **terminology** ([DOMAIN_TERMINOLOGY.md](./docs/DOMAIN_TERMINOLOGY.md)) — e.g. “student” vs “athlete”, “class” vs “class year”.
3. If touching KPIs or lifts, read **kpi-library** vs **listSchoolLifts** (overlap on strength activities).
4. Prefer extending **`src/components/ui/*`** primitives before one-off styles.
5. Match existing Tailwind + CSS variables in `globals.css` (sport green accent, dark theme).

## Demo context

- **General Demo** / **JHS**: sample rosters, Track and Field KPI sets, weightlifting periods (JHS).
- Female marks from JHS CSV; synthetic names in demo tenants.
- Password for demo users: see README (`rekcart`).
