#!/bin/sh
set -e

cd /app
mkdir -p /data

# Prisma SQLite requires a file: URL (P1012). Platforms like Railway often inject
# postgres:// when a Postgres plugin is linked — override with our SQLite path.
case "${DATABASE_URL:-}" in
  file:*)
    ;;
  *)
    if [ -n "${DATABASE_URL:-}" ]; then
      echo "WARNING: DATABASE_URL is not SQLite (expected file:...). Using file:/data/dev.db"
      echo "         Unlink Postgres on Railway or set DATABASE_URL=file:/data/dev.db"
    else
      echo "==> DATABASE_URL unset; using file:/data/dev.db"
    fi
    export DATABASE_URL="file:/data/dev.db"
    ;;
esac

if [ ! -f prisma/schema.prisma ]; then
  echo "ERROR: prisma/schema.prisma missing. If you mounted a volume on /app/prisma, remove it."
  exit 1
fi

echo "==> Prisma: applying schema..."
npx prisma db push

if [ ! -f /data/.seeded ] || [ "${FORCE_SEED}" = "1" ]; then
  echo "==> Seeding database (first run can take 1–2 minutes)..."
  npm run db:seed
  touch /data/.seeded
  echo "==> Seed complete."
fi

echo "==> Starting app on http://0.0.0.0:3000 (open http://localhost:3001 on your machine)..."

if [ "${APP_MODE}" = "production" ]; then
  npm run build
  exec npx next start -H 0.0.0.0 -p 3000
fi

exec npx next dev -H 0.0.0.0 -p 3000
