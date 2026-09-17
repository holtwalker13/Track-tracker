# Docker troubleshooting

The database is **SQLite inside the app container**, stored on the Docker volume `sap-db` at `/data/dev.db`. It is not in git.

Open **http://localhost:3000** (the compose file maps container 3000 → host 3000).

## Start

```bash
docker compose up --build
```

Wait for `Seed complete` / `Ready`. First seed can take a minute.

## Roster shows 0 athletes

Usually one of:

1. **Host Next.js on :3000, not Docker.** Stop `npm run dev`, then `docker compose up --build`.
2. **Old volume** from before the JHS seed. Either:
   ```bash
   FORCE_SEED=1 docker compose up --build
   ```
   or wipe it:
   ```bash
   docker compose down -v
   docker compose up --build
   ```
3. **Stale login cookie** from a previous seed. Sign out and log in as `coach1@jhs.demo` / `password123`.

## Port already allocated

Something else (often `npm run dev`) is using 3000. Stop it, or change the left side of `"3000:3000"` in `docker-compose.yml`.

## `schema.prisma` not found

An old volume was mounted over `/app/prisma`. `docker compose down -v` and start again.
