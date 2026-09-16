# Student Athletic Performance Platform

Web application for schools to **measure, compare, improve, compete, and project** student athletic performance across a continuous scholastic record.

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Prisma 5 + SQLite (development)
- Server-side services for percentiles, leaderboards, PRs, projections

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Implementation plan](./docs/IMPLEMENTATION_PLAN.md)

## Quick start (Docker — recommended on desktop)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git checkout cursor/student-athletic-platform-601a
docker compose up --build
```

First start runs migrations and seeds demo data (can take 1–2 minutes). Then open [http://localhost:3000](http://localhost:3000).

Re-seed from scratch:

```bash
docker compose down -v
docker compose up --build
```

Or without wiping the volume:

```bash
FORCE_SEED=1 docker compose up --build
```

Stop: `Ctrl+C`, then `docker compose down`.

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
| Coach | `coach1@riverside.demo` | `password123` |
| Student | `student29@riverside.demo` | `password123` |

Benchmark data in seed is **SYNTHETIC_DEV** — not real-world norms.

## MVP screens

**Coach**: Dashboard, Students, Testing (live grid + station), Leaderboards, Analytics, Benchmarks, Compare.

**Student**: Dashboard, My Performance, Progress, Leaderboards, Compare, Projection.
