#!/bin/sh
set -e

cd /app
mkdir -p /data

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
