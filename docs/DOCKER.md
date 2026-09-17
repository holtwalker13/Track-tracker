# Docker troubleshooting

## Symptom: `127.0.0.1:3001 refused to connect`

Nothing is listening on port 3001. Almost always the **container is not running**.

### 1. Start the app (keep this terminal open)

From the repo root (folder with `docker-compose.yml`):

```bash
git pull origin cursor/student-athletic-platform-601a
docker compose down -v
docker compose up --build
```

Wait until logs show **Ready** or `Starting app on http://0.0.0.0:3000`.  
First seed can take **1–2 minutes**.

Open: **http://localhost:3001**

### 2. Check container state

In a **second** terminal:

```bash
docker compose ps -a
```

| STATE | Meaning |
|--------|---------|
| `Up` | Good — if browser still fails, try `curl http://localhost:3001/login` |
| `Exited (1)` | App crashed — run `docker compose logs --tail 100 app` |

### 3. Common failures

| Log message | Fix |
|-------------|-----|
| `schema.prisma` not found | Old volume mounted on `/app/prisma` — `docker compose down -v` and pull latest |
| `Cannot find module` / build errors | Pull latest (needs `tsconfig.json`, `next.config.ts`) |
| Port already allocated | Change `3001:3000` to `3002:3000` in `docker-compose.yml` |
| `URL must start with the protocol file:` | `DATABASE_URL` is not SQLite — set `DATABASE_URL=file:/data/dev.db`. Do not link Railway Postgres for this app. |

### 4. Railway / hosted Docker

This app uses **SQLite**, not Postgres.

1. Set **`DATABASE_URL`** to `file:/data/dev.db` (or leave unset; the entrypoint defaults to this).
2. Add a **volume** mounted at `/data` so the database survives redeploys.
3. Do **not** attach Railway Postgres — it sets `postgres://…` and Prisma will reject it.

### 5. Without Docker (fallback)

```bash
npm install
cp .env.example .env
npx prisma db push && npm run db:seed
npm run dev
```

Then open **http://localhost:3000**.
