# Weight lifting — coach requirements (competitor parity)

Source: questionnaire from a long-time user of a dedicated lifting program (~$2,100/year for ~50 athletes). Track Tracker already serves JHS-style **weightlifting classes** (period rosters, squat/clean/bench tracking). This doc maps their answers to our product and defines what to build next.

## Coach answers → product mapping

| Topic | Competitor behavior | Track Tracker today | Accommodation |
|--------|---------------------|---------------------|---------------|
| Scope | Lifting only; jumps/speed elsewhere | Full KPI suite (speed, power, strength) in one app | **Lifting-only mode**: weightlifting classes default to strength activities only; speed/jump KPIs stay available for track/PE schools. |
| Workouts | Custom templates **and** auto-generated plans | Periodic **testing sessions** (live grid / student station), not daily workouts | **Phase 2**: `WorkoutTemplate` + assigned `WorkoutSession` per athlete/class/day. **Phase 2b**: generator from rules (e.g. 5×5 progression, deload weeks). |
| Sets & reps | Full control per exercise | Single **best attempt** per activity per session (1RM-style or rep max) | **Phase 2**: log each set (`weight`, `reps`, optional `RPE`) under a workout; keep existing `PerformanceResult` for formal test days and PRs. |
| Load recommendations | Auto-adjust next session from weight + reps + **RPE** | Manual entry only; no RPE | **Phase 3**: progression service (e.g. Epley estimated 1RM, RPE-based target load, coach override). Surface “suggested weight” on student workout UI. |
| Pricing | ~$2,100/yr for ~50 athletes | Not in app (school/district product) | Document tiering: per-school or per-active-athlete cap; out of scope for this repo. |
| Leaderboards | No in-app ranks; **analytics export** for coach-built boards | Built-in leaderboards (coach named, student anonymous option) + analytics/box scores | **Default for lifting coaches**: coach-facing analytics + CSV/export; optional **hide student leaderboards** per school (already have `nameHidden` / org settings — extend to disable student leaderboard nav for lifting-only schools). |
| Pain point | Accuracy depends on athletes logging every set with correct weight/reps/RPE | Same risk for live testing; station flow helps on test day | Workout UX: required fields, set-level validation, coach review queue, reminders; tie formal PRs to coach-verified test sessions. |

## What we already satisfy (lifting coach)

- **Roster by weight room period** (`Period N Weights`), CSV import, multi-class enrollment.
- **Strength catalog**: back squat, hang clean, bench, pull-ups, bodyweight-relative variants (`prisma/seed.ts`).
- **Live testing** for max-effort days with coach grid or student self-entry (`TestingSession`, `PerformanceResult`).
- **Progress & PRs** over time; coach analytics and leaderboards for comparing athletes.
- **Separation from track KPIs**: coach can run sessions with strength-only events (UI preset when class name indicates weights).

## Gaps to close for parity

### Phase 2 — Programmed training (highest priority)

Data model (proposed):

```
WorkoutTemplate (school, name, createdBy coach)
  └── WorkoutTemplateExercise (activityId, defaultSets, defaultReps, notes, sortOrder)

WorkoutAssignment (templateId, classId | studentId, scheduledDate)

WorkoutSession (assignmentId, studentId, status, completedAt)
  └── WorkoutSetLog (exerciseId, setNumber, weightLb, reps, rpe, skipped)
```

APIs: CRUD templates, assign to class, student completes sets, coach edits.

UI: Coach “Programs” + “Today’s workout”; Student “Log workout” (mobile-first).

### Phase 3 — Progression engine

- Inputs: last N sessions per lift, logged RPE, optional training max.
- Outputs: next-session prescribed load/reps; flag outliers (RPE 10 at low reps vs reported easy RPE).
- Coach toggles: auto-apply vs suggest-only; block auto for injured/DNP athletes (`PerformanceResult.status` pattern).

### Phase 4 — Lifting-only school profile

- `OrganizationSettings` or school flag: `primaryModule: TRACK | LIFTING | BOTH`.
- Navigation hides sprint/jump KPI targets when `LIFTING`.
- Analytics default metrics: squat/bench/clean absolute and × BW.

## Recommended MVP on this branch

1. **Requirements doc** (this file).
2. **Weightlifting session preset** when creating a live session for a `*Weights*` class (strength events pre-selected; sensible default session name).
3. **Next PR**: Prisma models above + minimal coach template editor (no generator yet).

## Open product questions

1. Do lifting coaches need **daily** logging or only **cycle test weeks** (current model)?
2. Is **bench press** always in the program (JHS CSV often has bench; KPI defaults emphasize relative squat/clean)?
3. Should generated workouts follow a published system (5/3/1, linear periodization) or coach-defined rules only?
4. Per-athlete caps for billing: align with district site license vs roster size?
