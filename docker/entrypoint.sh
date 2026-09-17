#!/bin/sh
set -e

cd /app

PORT="${PORT:-3000}"

if [ ! -f prisma/schema.prisma ]; then
  echo "ERROR: prisma/schema.prisma missing. If you mounted a volume on /app/prisma, remove it."
  exit 1
fi

if [ -z "$SESSION_SECRET" ] || [ "${#SESSION_SECRET}" -lt 16 ]; then
  echo "ERROR: SESSION_SECRET must be set to a string of at least 16 characters."
  echo "On Railway: service → Variables → SESSION_SECRET. Generate with: openssl rand -base64 32"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is required (Postgres connection string)."
  echo "Local Docker: docker compose sets it. Railway: add PostgreSQL and reference DATABASE_URL."
  exit 1
fi

case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *)
    echo "ERROR: DATABASE_URL must be a Postgres URL (postgresql://...)."
    echo "Got a non-Postgres value. Link Railway PostgreSQL and reference its DATABASE_URL on the app service."
    exit 1
    ;;
esac

run_db_push() {
  echo "==> Prisma db push (local/dev only) ..."
  i=0
  until npx prisma db push --skip-generate; do
    i=$((i + 1))
    if [ "$i" -ge 30 ]; then
      echo "ERROR: prisma db push failed after 30 attempts. Check DATABASE_URL and that Postgres is running."
      exit 1
    fi
    echo "==> Waiting for Postgres ($i/30)..."
    sleep 2
  done
}

if [ "${APP_MODE}" = "production" ]; then
  echo "==> Production: connecting to Postgres (schema managed in Railway — no prisma db push)."
  if [ "${FORCE_SEED}" = "1" ]; then
    echo "==> FORCE_SEED=1: running seed..."
    npm run db:seed
  fi
else
  run_db_push
  echo "==> Seeding if empty (FORCE_SEED=${FORCE_SEED:-0})..."
  npm run db:seed
fi

echo "==> Syncing demo passwords to rekcart (or DEMO_PASSWORD)..."
npm run db:sync-password

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
