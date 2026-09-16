#!/bin/sh
set -e

cd /app

if [ ! -f .env ]; then
  cp .env.example .env
fi

# Load DATABASE_URL from .env for Prisma
export $(grep -v '^#' .env | xargs)

npx prisma db push

if [ ! -f prisma/dev.db ] || [ "${FORCE_SEED}" = "1" ]; then
  npm run db:seed
fi

if [ "${APP_MODE}" = "production" ]; then
  npm run build
  exec npm run start
fi

exec npm run dev -- --hostname 0.0.0.0 --port 3000
