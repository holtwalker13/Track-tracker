# Deploy Track Tracker on Railway (Postgres)

This environment cannot log into your Railway account. After the GitHub branch is pushed, add **Railway PostgreSQL** in the dashboard and point the app at it.

**Production boots run `prisma db push`** so Railway Postgres picks up additive schema changes (for example `StudentProfile.participationType`). It does not wipe data for nullable column adds.

**Do not deploy an empty placeholder branch.** Use **`main`** (or your current deploy branch) after Postgres is linked.

## 1. New project from GitHub

1. Open [railway.app](https://railway.app) and sign in.
2. **New Project** → **Deploy from GitHub repo**.
3. Authorize GitHub if prompted, then select **`holtwalker13/Track-tracker`**.
4. Open the app service → **Settings** → **Source**.
5. Set **Branch** to `main` (or the branch you want live).

## 2. Add PostgreSQL (manual, required)

On the same project canvas:

1. **+ New** → **Database** → **PostgreSQL**.
2. Wait until the database is **Running**.
3. Open the **app** service → **Variables**.
4. **Add a variable reference** (or “Shared variable”) from the Postgres service:
   - Name on the app: `DATABASE_URL`
   - Value: the Postgres plugin’s `DATABASE_URL` (not `DATABASE_PUBLIC_URL` unless private networking fails)
5. Confirm the app `DATABASE_URL` starts with `postgresql://` or `postgres://`.

If a previous attempt set `DATABASE_URL=file:/data/dev.db`, delete that variable. Remove any **Volume** on the app; Postgres does not use `/data`.

## 3. Other app variables

| Name | Value |
|------|--------|
| `SESSION_SECRET` | a long random string (16+ chars) |
| `APP_MODE` | `production` |

```bash
openssl rand -base64 32
```

Optional: `FORCE_SEED=1` for **one** deploy to wipe and reload CSV data, then unset it. First boot seeds automatically when the database has no users.

## 4. Public URL

Settings → **Networking** → **Generate domain**.

Redeploy the app after Postgres and variables are attached. Boot runs `prisma db push` to sync tables, then starts the app. Seed only runs if you set `FORCE_SEED=1` (one deploy), or use local Docker for a full reload.

## 5. Log in

| Role | Email | Password |
|------|--------|----------|
| Coach | `coach1@jhs.demo` | `rekcart` |
| Student | `student1@jhs.demo` | `rekcart` |

## If deploy fails

- **Wrong branch / empty site:** source branch is `main`. Switch to `cursor/railway-deploy-efe1`.
- **P1001 / can’t reach database:** Postgres is not running, or `DATABASE_URL` is missing / still a `file:` SQLite path. Use a variable **reference** from the Postgres service.
- **IPv6 / private URL errors:** switch the reference to `DATABASE_PUBLIC_URL` (or the public `DATABASE_URL`) and redeploy.
- **Crashes on SESSION_SECRET:** variable missing or shorter than 16 characters.
- **Empty roster after a wipe:** `FORCE_SEED=1` was left on, or seed failed — check **Deploy Logs**.
- **Healthcheck failed:** first seed can take a minute. `railway.toml` allows 300s.

## Local Docker

Local compose now runs **Postgres + the app** (not SQLite):

```bash
docker compose down -v
docker compose up --build
```

Open http://localhost:3000. Host `npm run dev` should use `DATABASE_URL=postgresql://sap:sap@localhost:5432/sap` from `.env.example` so it hits the same Compose Postgres.
