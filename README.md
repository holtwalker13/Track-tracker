# Track Tracker — JHS Athletics

Web application for a school to **measure, compare, improve, compete, and project** athletic performance. Roster is grouped by **graduating class**, not grade 6–12.

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Prisma 5 + **PostgreSQL** (Docker Compose `postgres` service locally; Railway Postgres in production)
- Real female testing data from the JHS Athletics KPI database; boy data is a same-structure synthetic analog

Git does **not** contain the database. Pulling code never copies students onto localhost. Docker creates Postgres and seeds it on startup.

## Quick start (Docker)

Stop anything already bound to port 3000 (`npm run dev`), then from the repo root:

```bash
git checkout cursor/railway-deploy-efe1
git pull
docker compose up --build
```

Wait until logs show seed complete / Ready, then open **http://localhost:3000**.

The first start loads the JHS CSV when the database has no users. Later starts reuse Postgres. To reload athlete data after a CSV/seed change:

```bash
FORCE_SEED=1 docker compose up --build
```

To wipe Postgres and start clean:

```bash
docker compose down -v
docker compose up --build
```

| Role | Email | Password |
|------|--------|----------|
| Coach | `coach1@jhs.demo` | `rekcart` |
| Student (Kendall Leland) | `student1@jhs.demo` | `rekcart` |

## Why refresh showed 0 athletes

`http://localhost:3000` from `npm run dev` is a different process than Docker. Point `.env` at Compose Postgres (`postgresql://sap:sap@localhost:5432/sap`) or stop the host app and use `docker compose up --build`. If you still have an old SQLite-only stack, run `docker compose down -v` once so Postgres can be created.

## Data

- **Girls**: imported from `prisma/data/jhs-female-athletes.csv` (class years 2026–2031).
- **Boys**: generated with the same class years, sparsity, and events, scaled to typical male HS marks. There is no boy KPI sheet.
- **KPI key**: flying 10m, broad jump, vertical, squat/BW, hang clean/BW, 20m start, and 40yd map to a likely **100m / 40-yard** time. Female 12.5 / 13.0 / 13.5s bands come from the JHS key. The 13.0s flying-10m target is **1.188s** (the source cell listed 1.879s, which was slower than the 13.5s target and treated as a typo).
- One school year of results (2025–2026), not a multi-year history.

## Deploy on Railway

Railway provides a **PostgreSQL** plugin you add next to the app (a few extra clicks). This environment cannot sign into your Railway account, so those clicks happen in the dashboard.

**Deploy branch `cursor/railway-deploy-efe1`, not `main`.** `main` is still an empty placeholder.

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → `holtwalker13/Track-tracker`.
2. Service **Settings → Source → Branch** = `cursor/railway-deploy-efe1`.
3. **+ New → Database → PostgreSQL**. Wait until it is running.
4. On the **app** service → **Variables** → add a **reference** to the Postgres `DATABASE_URL` (must start with `postgresql://` / `postgres://`, not `file:`).
5. Also set `SESSION_SECRET` (`openssl rand -base64 32`) and `APP_MODE=production`.
6. **Settings → Networking → Generate domain.**
7. Wait for the first deploy to seed, then log in as `coach1@jhs.demo` / `rekcart`.

Skip the SQLite volume. If an earlier attempt set `DATABASE_URL=file:/data/dev.db`, delete it. Full notes: [docs/RAILWAY.md](docs/RAILWAY.md).

## MVP screens

**Coach**: Dashboard, Roster, Testing, Leaderboards, Analytics, KPI targets, Compare.

**Student**: Dashboard (sprint potential), My Performance, Progress, Leaderboards, Compare, Projection.
