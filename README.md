# Track Tracker — JHS Athletics

Web application for a school to **measure, compare, improve, compete, and project** athletic performance. Roster is grouped by **graduating class**, not grade 6–12.

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Prisma 5 + **SQLite inside Docker** (`sap-db` volume → `/data/dev.db`)
- Real female testing data from the JHS Athletics KPI database; boy data is a same-structure synthetic analog

Git does **not** contain the database. Pulling code never copies students onto localhost. Docker creates and seeds the DB on startup.

## Quick start (Docker)

Stop anything already bound to port 3000 (`npm run dev`), then from the repo root:

```bash
git checkout cursor/jhs-kpi-class-data-efe1
git pull
docker compose up --build
```

Wait until logs show seed complete / Ready, then open **http://localhost:3000**.

The first start (or a seed-version bump) loads the JHS CSV into the Docker volume. Later starts reuse that volume. To reload athlete data after a CSV/seed change:

```bash
FORCE_SEED=1 docker compose up --build
```

To wipe the volume and start clean:

```bash
docker compose down -v
docker compose up --build
```

| Role | Email | Password |
|------|--------|----------|
| Coach | `coach1@jhs.demo` | `password123` |
| Student (Kendall Leland) | `student1@jhs.demo` | `password123` |

## Why refresh showed 0 athletes

`http://localhost:3000` from `npm run dev` uses a **different** SQLite file (`prisma/dev.db` on your machine) than Docker (`/data/dev.db` in the `sap-db` volume). Docker used to publish **:3001**. If the UI updated but the table was empty, the app was running on the host without a seed.

## Data

- **Girls**: imported from `prisma/data/jhs-female-athletes.csv` (class years 2026–2031).
- **Boys**: generated with the same class years, sparsity, and events, scaled to typical male HS marks. There is no boy KPI sheet.
- **KPI key**: flying 10m, broad jump, vertical, squat/BW, hang clean/BW, 20m start, and 40yd map to a likely **100m / 40-yard** time. Female 12.5 / 13.0 / 13.5s bands come from the JHS key. The 13.0s flying-10m target is **1.188s** (the source cell listed 1.879s, which was slower than the 13.5s target and treated as a typo).
- One school year of results (2025–2026), not a multi-year history.

## MVP screens

**Coach**: Dashboard, Roster, Testing, Leaderboards, Analytics, KPI targets, Compare.

**Student**: Dashboard (sprint potential), My Performance, Progress, Leaderboards, Compare, Projection.
