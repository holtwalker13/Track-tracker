#!/bin/sh
set -e

cd /app
mkdir -p /data

PORT="${PORT:-3000}"
export DATABASE_URL="${DATABASE_URL:-file:/data/dev.db}"

if [ ! -f prisma/schema.prisma ]; then
  echo "ERROR: prisma/schema.prisma missing. If you mounted a volume on /app/prisma, remove it."
  exit 1
fi

if [ -z "$SESSION_SECRET" ] || [ "${#SESSION_SECRET}" -lt 16 ]; then
  echo "ERROR: SESSION_SECRET must be set to a string of at least 16 characters."
  echo "On Railway: service → Variables → SESSION_SECRET. Generate with: openssl rand -base64 32"
  exit 1
fi

# SQLite lives on the volume at /data/dev.db (Docker compose and Railway both mount /data).
# Do this at start, not pre-deploy — Railway volumes are not mounted during pre-deploy.
echo "==> Prisma: applying schema (${DATABASE_URL}) ..."
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

echo "==> Starting app on http://0.0.0.0:${PORT} ..."

if [ "${APP_MODE}" = "production" ]; then
  export NODE_ENV=production
  if [ ! -d .next ]; then
    echo "==> No production build in image; running npm run build ..."
    npm run build
  fi
  exec npx next start -H 0.0.0.0 -p "$PORT"
fi

export NODE_ENV=development
exec npx next dev -H 0.0.0.0 -p "$PORT"
