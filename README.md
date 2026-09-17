# Track Tracker — JHS Athletics

Web application for a school to **measure, compare, improve, compete, and project** athletic performance. Roster is grouped by **graduating class**, not grade 6–12.

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Prisma 5 + SQLite (development)
- Real female testing data from the JHS Athletics KPI database; boy data is a same-structure synthetic analog

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Implementation plan](./docs/IMPLEMENTATION_PLAN.md)

## Quick start (Node on host)

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Role | Email | Password |
|------|--------|----------|
| Coach | `coach1@jhs.demo` | `password123` |
| Student (Kendall Leland) | `student1@jhs.demo` | `password123` |

## Data

- **Girls**: imported from `prisma/data/jhs-female-athletes.csv` (class years 2026–2031).
- **Boys**: generated with the same class years, sparsity, and events, scaled to typical male HS marks. There is no boy KPI sheet.
- **KPI key**: flying 10m, broad jump, vertical, squat/BW, hang clean/BW, 20m start, and 40yd map to a likely **100m / 40-yard** time. Female 12.5 / 13.0 / 13.5s bands come from the JHS key. The 13.0s flying-10m target is **1.188s** (the source cell listed 1.879s, which was slower than the 13.5s target and treated as a typo).
- One school year of results (2025–2026), not a multi-year history.

## MVP screens

**Coach**: Dashboard, Roster (class + Boys/Girls box scores), Testing, Leaderboards, Analytics, KPI targets, Compare.

**Student**: Dashboard (sprint potential), My Performance, Progress, Leaderboards, Compare, Projection.
