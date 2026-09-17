#!/bin/sh
set -e

cd /app
mkdir -p /data

if [ ! -f prisma/schema.prisma ]; then
  echo "ERROR: prisma/schema.prisma missing. If you mounted a volume on /app/prisma, remove it."
  exit 1
fi

# SQLite lives on the Docker volume at /data/dev.db (see docker-compose DATABASE_URL).
echo "==> Prisma: applying schema to /data/dev.db ..."
npx prisma db push

SEED_VERSION="jhs-kpi-1"
if [ -f prisma/seed-version.txt ]; then
  SEED_VERSION=$(tr -d '[:space:]' < prisma/seed-version.txt)
fi
CURRENT_VERSION=""
if [ -f /data/.seed-version ]; then
  CURRENT_VERSION=$(tr -d '[:space:]' < /data/.seed-version)
fi

if [ "${FORCE_SEED}" = "1" ] || [ "$CURRENT_VERSION" != "$SEED_VERSION" ]; then
  echo "==> Seeding JHS roster (version $SEED_VERSION; was '${CURRENT_VERSION:-none}')..."
  npm run db:seed
  echo "$SEED_VERSION" > /data/.seed-version
  echo "==> Seed complete."
else
  echo "==> Database already seeded ($SEED_VERSION). Set FORCE_SEED=1 to reload CSV data."
fi

echo "==> Starting app on http://0.0.0.0:3000 (open http://localhost:3000 on your machine)..."

if [ "${APP_MODE}" = "production" ]; then
  npm run build
  exec npx next start -H 0.0.0.0 -p 3000
fi

exec npx next dev -H 0.0.0.0 -p 3000
