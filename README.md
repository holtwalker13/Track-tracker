<<<<<<< HEAD
# Track-tracker
=======
# Student Athletic Performance Platform

Web application for schools to **measure, compare, improve, compete, and project** student athletic performance across a continuous scholastic record.

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Prisma 5 + SQLite (development)
- Server-side services for percentiles, leaderboards, PRs, projections

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Implementation plan](./docs/IMPLEMENTATION_PLAN.md)

## Quick start

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
>>>>>>> 05d71eb (feat: MVP student athletic performance platform)
