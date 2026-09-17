# Deploy Track Tracker on Railway

This VM cannot log into your Railway account. After the GitHub branch is pushed, you connect the repo in the Railway dashboard (about 5 minutes).

**Do not deploy `main`.** That branch is still a README-only placeholder. Deploy branch **`cursor/railway-deploy-efe1`**.

The app keeps **SQLite** (same as local Docker). Add a Railway volume so the database survives redeploys. Do not add a Postgres plugin unless you also change Prisma.

## 1. New project from GitHub

1. Open [railway.app](https://railway.app) and sign in.
2. **New Project** → **Deploy from GitHub repo**.
3. Authorize GitHub if prompted, then select **`holtwalker13/Track-tracker`**.
4. Open the new service → **Settings** → **Source**.
5. Set **Branch** to `cursor/railway-deploy-efe1` (not `main`).
6. Trigger a deploy if it started from `main` first.

## 2. Persistent volume (required)

SQLite is a file. Without a volume, every deploy wipes the roster.

1. In the service, click **New** / **Volume** (or Settings → Volumes).
2. **Mount path:** `/data`
3. Keep the volume in the **same region** as the service.

`DATABASE_URL` must be `file:/data/dev.db` so Prisma writes onto that volume.

## 3. Variables

Service → **Variables**. Add:

| Name | Value |
|------|--------|
| `DATABASE_URL` | `file:/data/dev.db` |
| `SESSION_SECRET` | a long random string (16+ chars) |
| `APP_MODE` | `production` |

Generate a secret:

```bash
openssl rand -base64 32
```

Optional: `FORCE_SEED=1` for one deploy if you need to reload CSV data (this **wipes** existing results, then unset it).

Do **not** create a Railway Postgres plugin and copy its `DATABASE_URL` — Prisma is still SQLite.

## 4. Public URL

Settings → **Networking** → **Generate domain**.

First boot runs `prisma db push` and seeds ~336 athletes. Wait until the deploy is **Active** and the healthcheck on `/login` passes (up to a few minutes).

## 5. Log in

| Role | Email | Password |
|------|--------|----------|
| Coach | `coach1@jhs.demo` | `password123` |
| Student | `student1@jhs.demo` | `password123` |

## If deploy fails

- **Wrong branch / empty site:** source branch is `main`. Switch to `cursor/railway-deploy-efe1`.
- **Crashes on start / SESSION_SECRET:** variable missing or shorter than 16 characters.
- **Empty roster after redeploy:** volume is not mounted at `/data`, or `DATABASE_URL` is not `file:/data/dev.db`.
- **Build timeout:** the Dockerfile builds Next.js at image build time; wait for that step. Seed happens at **start**, not build.
- **Healthcheck failed:** first seed can take a minute. `railway.toml` allows 300s. Check **Deploy Logs** for seed output.

Local Docker is unchanged: `docker compose up --build` still serves http://localhost:3000 with the `sap-db` volume.
