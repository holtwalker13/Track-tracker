# Implementation Plan (Phase 1 MVP)

## Completed in this branch

- **Phase A**: Prisma schema (multi-tenant org → school → users), school years, enrollments, activity catalog, seed (~295 students, 3 years history).
- **Phase B**: Testing sessions, live grid + student station entry, attempts, PR detection, correction via supersede.
- **Phase C**: Student/coach profiles, progress series, YoY improvement.
- **Phase D**: Synthetic benchmark datasets, percentile engine, comparison UI.
- **Phase E**: Leaderboards (identified for coaches, anonymous for students), PR highlights, achievement schema + seed definitions.
- **Phase F**: Coach dashboard, directory, grade analytics, testing coverage bars.
- **Phase G**: Projection service + student UI with disclaimer.

## Weight lifting (coach parity)

See [WEIGHT_LIFTING.md](./WEIGHT_LIFTING.md) for competitor questionnaire mapping, gaps (workouts, sets/reps, RPE progression), and phased build plan.

**On branch `weight-lifting`**: strength-only session preset for `*Weights*` classes; full program builder is Phase 2.

## Recommended next iterations

1. **Auth hardening**: Admin UI, password reset, email verification.
2. **Testing session CRUD**: Create sessions in UI (grade/class/student picker).
3. **School / all-time records**: Materialized views or cached queries for record boards.
4. **Achievements engine**: Event hooks on result save to award badges.
5. **CSV import**: Column mapping pipeline (architecture only in PRD today).
6. **PostgreSQL**: Switch `DATABASE_URL` for production; enums can be restored.
7. **Export reports**: PDF generation from student profile.
8. **District scope**: Cross-school anonymized aggregates when `benchmarkSharingEnabled`.

## Local development

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Coach: `coach1@riverside.demo` / `password123`  
Student: `student29@riverside.demo` / `password123`
