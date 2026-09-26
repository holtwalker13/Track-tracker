# Application Audit Report

**Application:** Track Tracker (SAP) — school exercise/performance tracking  
**Audit date:** 2026-09-26  
**Scope:** Full repository discovery, architecture mapping, health/UX/security review  
**Approach:** Conservative; preserve behavior unless fixing confirmed risk

---

## Executive Summary

The application is a **coherent Next.js 15 monolith** with a well-structured Prisma schema and clear separation between `src/lib/services` (writes/rules) and `src/lib/queries` (read models). Core flows—live testing, roster, leaderboards, KPI targets, workouts—are implemented and usable.

**Strengths**

- Centralized scoring helpers (`format.ts`, `performance.ts`, `leaderboard.ts`)
- School-scoped API checks on most mutating routes
- Explicit performance result model with status, entry method, and supersede support for corrections
- Shared leaderboard/grid components between coach and student views

**Top risks addressed in this stabilization pass**

- Live testing **save API** did not enforce session recording state or participant membership (UI-only guards).
- Testing APIs used **JWT-only** `getSession()` instead of DB-validated `requireSession()`.
- Live testing UI allowed edits when **recording was locked** (ignored `recordingUnlocked`).
- **`listStudents`** always returned `prs: 0` (placeholder).

**Remaining themes**

- No automated test suite before this audit; critical math now has starter unit tests.
- Several **large client components** (700+ lines) mix data, filters, and presentation.
- **Duplicate** leaderboard query paths and parallel KPI/lifts API implementations.
- **`permissions.ts` helpers unused** in routes.
- **Zero test coverage** for E2E workflows (login → record → leaderboard).

---

## Architecture Overview

See [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md). Summary: Next.js App Router + Prisma/PostgreSQL + cookie JWT sessions; coach/student/admin route groups; business logic in services; pages compose queries + components.

---

## P0 — Data / Security Risk

### P0-1: Live save API bypasses session lock and membership

| Field | Detail |
|-------|--------|
| **Location** | `src/app/api/testing/save/route.ts`, `src/app/coach/testing/[sessionId]/page.tsx` |
| **Problem** | Closed/paused/locked sessions could still accept POST saves; any student ID in the school year could be written to a session without verifying `TestingSessionStudent` membership. |
| **Risk** | Unauthorized or stale edits to performance data; integrity of closed test days. |
| **Recommended fix** | Enforce `isLiveRecordingOpen()` on server; verify student `schoolId`, activity in session, student in session roster. Align UI `coachCanEdit` with `recordingUnlocked`. |
| **Estimated scope** | Small |
| **Regression risk** | Low if rules match existing UI intent |
| **Status** | **Fixed** in stabilization branch |

### P0-2: Testing session-meta uses JWT-only auth

| Field | Detail |
|-------|--------|
| **Location** | `src/app/api/testing/session-meta/route.ts` |
| **Problem** | Uses `getSession()` — revoked/deleted users remain authorized until JWT expiry. Exposes student names for session roster to any valid coach JWT. |
| **Risk** | Weaker auth boundary; stale sessions after user removal. |
| **Recommended fix** | Use `requireSession(["COACH","ADMIN"])`. |
| **Estimated scope** | Trivial |
| **Regression risk** | Very low |
| **Status** | **Fixed** |

---

## P1 — Functional Bugs

### P1-1: Roster list API reports zero PRs

| Field | Detail |
|-------|--------|
| **Location** | `src/lib/queries/coach.ts` — `listStudents()` |
| **Problem** | Hard-coded `prs: 0` for every student. |
| **Risk** | Misleading data wherever PR count is shown (compare picker, class editor). |
| **Recommended fix** | Aggregate `PerformanceResult` where `isPersonalRecord: true` for current school year. |
| **Estimated scope** | Small |
| **Regression risk** | Low |
| **Status** | **Fixed** |

### P1-2: Live grid editable when recording locked

| Field | Detail |
|-------|--------|
| **Location** | `src/app/coach/testing/[sessionId]/page.tsx` (`coachCanEdit`) |
| **Problem** | `recordingUnlocked` not included in edit gate (only status/window). |
| **Risk** | Coaches think recording is locked but grid still accepts input (until save — now blocked server-side). |
| **Recommended fix** | Include `recordingUnlocked` and shared `isLiveRecordingOpen()`. |
| **Estimated scope** | Trivial |
| **Regression risk** | Low |
| **Status** | **Fixed** |

### P1-3: `isLiveRecordingOpen` defined but unused

| Field | Detail |
|-------|--------|
| **Location** | `src/lib/constants.ts` |
| **Problem** | Helper exists; live page duplicated partial logic. |
| **Risk** | Drift between UI and API rules. |
| **Recommended fix** | Use helper in page + save route. |
| **Estimated scope** | Trivial |
| **Regression risk** | Low |
| **Status** | **Fixed** (save + coach page) |

### P1-4: Live save omits HTTP error handling in grid

| Field | Detail |
|-------|--------|
| **Location** | `src/components/testing/live-grid.tsx` |
| **Problem** | Failed saves set `saved` from JSON without checking `res.ok`; user may see false success. |
| **Risk** | Ambiguous UX on validation/forbidden errors. |
| **Recommended fix** | Surface error toast/state when `!res.ok`. |
| **Estimated scope** | Small |
| **Regression risk** | Low |
| **Status** | **Fixed** (saved flag only; user-visible error message still open) |

### P1-5: `getPreviousBest` uses `testingDate: { lt: beforeDate }` only

| Field | Detail |
|-------|--------|
| **Location** | `src/lib/services/results.ts` |
| **Problem** | Same-calendar-day results from other sessions excluded when `beforeDate` is session midnight. |
| **Risk** | Edge-case PR false positives/negatives on same test day. |
| **Recommended fix** | Document as accepted rule or refine to exclude only current session rows. |
| **Estimated scope** | Medium |
| **Regression risk** | Medium — affects PR semantics |
| **Status** | Documented; requires product decision |

---

## P2 — Architectural Debt

### P2-1: Duplicate login flows

| **Location** | `src/app/login/actions.ts`, `src/app/api/auth/login/route.ts` |
| **Problem** | Parallel credential handling |
| **Risk** | Divergent validation/redirect behavior |
| **Fix** | Extract shared `authenticateUser()` used by both |
| **Scope** | Medium |

### P2-2: KPI targets vs lifts API duplication

| **Location** | `src/app/api/kpi-targets/route.ts`, `src/app/api/lifts/route.ts` |
| **Problem** | Near-identical CRUD for school activities |
| **Risk** | Fix one, miss the other |
| **Fix** | Shared route helpers or single router with `kind` param |
| **Scope** | Medium |

### P2-3: Multiple leaderboard query implementations

| **Location** | `queries/coach.ts`, `leaderboard-grid.ts`, `leaderboard-student.ts` |
| **Problem** | Overlapping rank/filter logic |
| **Risk** | Inconsistent ranks between pages |
| **Fix** | Single `getLeaderboard` with options; thin wrappers |
| **Scope** | Medium |

### P2-4: Unused permission helpers

| **Location** | `src/lib/auth/permissions.ts` |
| **Problem** | `canAccessStudentRecord`, `leaderboardDisplayName` not used in routes |
| **Risk** | Authorization logic scattered ad hoc |
| **Fix** | Adopt helpers in API routes incrementally |
| **Scope** | Medium |

### P2-5: Live grid session save deletes rows instead of superseding

| **Location** | `saveAttemptResults` transaction |
| **Problem** | Differs from documented “supersede corrections” for manual edits |
| **Risk** | Audit trail loss within session (acceptable for live re-entry?) |
| **Fix** | Document as intentional for LIVE_GRID; keep supersede for MANUAL |
| **Scope** | Documentation only unless audit required |

### P2-6: God components

| **Location** | `kpi-targets-editor.tsx` (~750 lines), `workout-programs-panel.tsx` (~700), `live-testing-studio.tsx` (~560) |
| **Problem** | Mixed fetch, validation, layout |
| **Fix** | Extract hooks/subpanels without behavior change |
| **Scope** | Large |

### P2-7: Duplicate CSV parsing

| **Location** | `src/app/api/classes/import/route.ts` vs `src/lib/csv.ts` |
| **Fix** | Use shared parser |
| **Scope** | Small |

---

## P3 — UX / Design Inconsistency

### P3-1: Coach nav order vs mental model

| **Location** | `navigation.ts` — Dashboard listed last |
| **Problem** | Unusual IA; leaderboards first |
| **Fix** | Document intentional “competition-first” or reorder with user research |
| **Scope** | Small |

### P3-2: Mixed terminology (athlete vs student)

| **Location** | Components under `athletes/`, labels “Roster”, “Fitness Testing” |
| **Fix** | Follow [DOMAIN_TERMINOLOGY.md](./DOMAIN_TERMINOLOGY.md) incrementally |
| **Scope** | Ongoing |

### P3-3: Responsive tables

| **Location** | `roster-table.tsx`, leaderboard grids |
| **Problem** | Wide tables on mobile rely on horizontal scroll |
| **Fix** | Card/stack pattern on `< md` where high-traffic |
| **Scope** | Medium per screen |

### P3-4: Duplicate compare / performance page composition

| **Location** | Coach vs student compare and performance pages |
| **Fix** | Shared layout components with role props |
| **Scope** | Medium |

---

## P4 — Cosmetic Cleanup

- Unused imports (run ESLint with `--fix` after `npm install`)
- `leaderboardDisplayName` dead export in `permissions.ts`
- Legacy session statuses (`DRAFT`, `ACTIVE`, `COMPLETED`) still accepted alongside `LIVE`/`CLOSED`

---

## Duplicate Logic (summary)

| Concern | Primary | Duplicates |
|---------|---------|------------|
| Activity formatting | `lib/format.ts` | Some inline `toFixed` in components |
| Leaderboard ranking | `services/leaderboard.ts` + `getLeaderboard` | `leaderboard-student.ts`, dashboard slices |
| Display names | `leaderboardEntryName` | `permissions.leaderboardDisplayName` (unused) |
| Login | `login/actions.ts` | `api/auth/login` |
| School activity CRUD | `kpi-targets` route | `lifts` route |
| Workout log UI | `student/workout` | `coach/programs/session/[id]` |

---

## Data Integrity Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Live save without session guard | High | **Mitigated** (P0-1) |
| `deleteMany` + recreate on live save | Medium | Intentional for attempt slots; not for historical imports |
| Non-transactional multi-step imports | Medium | Review `import-marks`, roster import for partial failure |
| Workout complete → performance sync | Medium | Verify idempotency on double complete |
| PR flags on re-save | Low | Recalculated each save within transaction |

---

## Responsive Issues (spot check)

| Breakpoint | Observations |
|------------|--------------|
| 375–430px | Live testing studio has mobile layout; roster table scrolls horizontally |
| 768px | Nav compacts via `AppShell`; filter modals used on leaderboards |
| 1024px+ | Grid layouts stable |

**Recommendation:** Manual pass on live entry + roster at 375px after each testing UI change.

---

## Design System Issues

- CSS variables in `globals.css` provide consistent dark theme, sport medal colors, 18px base font.
- UI primitives exist but many pages use ad hoc Tailwind classes on raw `<button>`/`<input>`.
- **Recommendation:** Extend `components/ui` with `Button`, `Input`, `EmptyState`, `Spinner` when touching screens—avoid big-bang redesign.

---

## Performance Issues

| Item | Severity | Location |
|------|----------|----------|
| `getStudentActivityRanks` N× `getLeaderboard` | Medium | `queries/coach.ts` |
| `listStudents` take 500 + nested results | Low | Acceptable for demo scale |
| Leaderboard fetch up to 500 entries | Low | Indexed queries |
| No obvious N+1 in live testing page | — | Uses batched `getPreviousBest` per student (O(n) queries) |

Optimize live testing previous-best with one grouped query only if roster sizes grow large.

---

## Security Concerns

| Item | Severity | Status |
|------|----------|--------|
| School ID checks on mutations | Good | Most routes |
| Student self-access on workouts | Good | sets/complete routes |
| Testing save membership | Was weak | **Fixed** |
| JWT-only testing routes | Was weak | **Fixed** meta |
| Station kiosk page | Medium | Client page; relies on API auth (OK if API solid) |
| Admin can access any school when switched | By design | Document for operators |
| No rate limiting on login | Low | Future hardening |

---

## Dead Code Candidates

| Classification | Item |
|----------------|------|
| **LIKELY OBSOLETE** | `leaderboardDisplayName` in `permissions.ts` |
| **REQUIRES REVIEW** | Legacy testing statuses in `TestingSessionStatus` type |
| **REQUIRES REVIEW** | `docs/IMPLEMENTATION_PLAN.md` vs current feature set |
| **SAFE TO REMOVE** | None auto-removed in this pass |

---

## Recommended Refactors (ordered)

1. ~~Enforce live testing save guards (P0)~~ **Done**
2. ~~Fix PR count in `listStudents`~~ **Done**
3. Add error UX to live grid saves (P1-4)
4. Consolidate login authentication (P2-1)
5. Unify leaderboard queries (P2-3)
6. Wire `permissions.ts` into student API routes (P2-4)
7. Split largest components (P2-6)
8. Add Playwright smoke tests for coach record flow (testing strategy)

---

## Recommended Tests

| Workflow | Type | Priority |
|----------|------|----------|
| `calculatePersonalRecord` / `pickBestAttempt` / `isBetter` | Unit | **Added** |
| `saveAttemptResults` PR edge cases | Integration (DB) | High |
| Login + role redirect | E2E | High |
| Live save forbidden when CLOSED | API integration | High |
| Leaderboard rank consistency | Snapshot/query test | Medium |

---

## Issues Fixed in Stabilization Branch

- Server-side live testing save validation (recording state, roster, activity, school)
- `requireSession` on testing session-meta
- Coach live page respects `recordingUnlocked` via `isLiveRecordingOpen`
- Accurate PR counts in `listStudents`
- Unit tests for performance math
- Documentation: `SYSTEM_ARCHITECTURE.md`, `APP_AUDIT.md`, `DOMAIN_TERMINOLOGY.md`

---

## Known Remaining Technical Debt

See P1 open items and all P2–P4 sections above. Largest maintainability wins: unify leaderboards, adopt permission helpers, add E2E smoke tests, and trim god components without changing business rules.

---

## Recommended Next Development Priorities

1. API integration tests for `/api/testing/save` (open/closed session, wrong student)
2. Live grid error feedback and disable save while in flight (double-submit already partially gated via `saving` state)
3. Consolidate KPI/lifts APIs
4. Mobile roster cards for small viewports
5. Expand unit tests to `rankResults` and percentile interpolation
