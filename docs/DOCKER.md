# Docker troubleshooting

The database is **Postgres** in the `postgres` Compose service (`sap-pg` volume). The app container talks to it at `postgresql://sap:sap@postgres:5432/sap`. Nothing is stored as a SQLite file.

Open **http://localhost:3000**.

## Start

```bash
docker compose up --build
```

Wait for `Seed complete` / `Ready`. First seed can take a minute.

If you previously used the SQLite volume (`sap-db`), wipe the old stack so Compose can create Postgres:

```bash
docker compose down -v
docker compose up --build
```

## Roster shows 0 athletes

Usually one of:

1. **Host Next.js on :3000, not Docker.** Stop `npm run dev`, then `docker compose up --build`. If you want `npm run dev`, point `.env` at Compose Postgres: `postgresql://sap:sap@localhost:5432/sap`.
2. **Empty or old database.** Reload CSV data:
   ```bash
   FORCE_SEED=1 docker compose up --build
   ```
   or wipe Postgres and start clean:
   ```bash
   docker compose down -v
   docker compose up --build
   ```
3. **Stale login cookie** from a previous seed. Sign out and log in as `coach1@jhs.demo` / `password123`.

## Port already allocated

Something else (often `npm run dev`) is using 3000, or another Postgres is using 5432. Stop it, or change the left side of the port mapping in `docker-compose.yml`.

## `schema.prisma` not found

An old volume was mounted over `/app/prisma`. `docker compose down -v` and start again.
