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

# Baseline legacy databases that were created with `prisma db push` (no migration
# history). If PerformanceResult already exists and _prisma_migrations is empty /
# missing the init migration, mark init as applied so deploy only runs additive
# durability migrations — never wipe athlete data.
baseline_legacy_db_push_if_needed() {
  if ! command -v node >/dev/null 2>&1; then
    return 0
  fi
  node <<'NODE'
const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const prisma = new PrismaClient();

(async () => {
  try {
    const tables = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'PerformanceResult'`
    );
    const hasResultsTable = Array.isArray(tables) && tables[0] && tables[0].c > 0;
    if (!hasResultsTable) {
      process.exit(0);
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `);

    const applied = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM "_prisma_migrations"
       WHERE "migration_name" = '20251001000000_init'`
    );
    const hasInit = Array.isArray(applied) && applied[0] && applied[0].c > 0;
    if (!hasInit) {
      console.log("==> Legacy db-push database detected; baselining 20251001000000_init ...");
      execSync("npx prisma migrate resolve --applied 20251001000000_init", {
        stdio: "inherit",
      });
    }
    process.exit(0);
  } catch (err) {
    console.error("==> Baseline check skipped:", err && err.message ? err.message : err);
    process.exit(0);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
})();
NODE
}

# Never auto-wipe or accept destructive schema changes on boot.
# Performance marks live in Postgres; deploys must be additive-only.
run_migrations() {
  echo "==> Prisma migrate deploy (additive schema sync, no data loss) ..."
  i=0
  until npx prisma migrate deploy; do
    i=$((i + 1))
    if [ "$i" -eq 1 ]; then
      echo "==> migrate deploy failed once; attempting legacy baseline then retry..."
      baseline_legacy_db_push_if_needed
    fi
    if [ "$i" -ge 30 ]; then
      echo "ERROR: prisma migrate deploy failed after 30 attempts."
      echo "See docs/DATA_DURABILITY.md for manual baseline steps."
      exit 1
    fi
    echo "==> Waiting for Postgres / retrying migrate ($i/30)..."
    sleep 2
  done
}

# Wait until Postgres accepts connections before baseline/migrate.
i=0
until npx prisma db execute --stdin <<'SQL' >/dev/null 2>&1
SELECT 1;
SQL
do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "ERROR: Postgres not reachable after 30 attempts. Check DATABASE_URL."
    exit 1
  fi
  echo "==> Waiting for Postgres ($i/30)..."
  sleep 2
done

baseline_legacy_db_push_if_needed
run_migrations

if [ "${APP_MODE}" = "production" ]; then
  if [ "${FORCE_SEED}" = "1" ]; then
    echo "ERROR: FORCE_SEED=1 is blocked in production to protect athlete data."
    echo "Unset FORCE_SEED, restore from backup if you intentionally need a wipe, then re-seed offline."
    exit 1
  fi
else
  echo "==> Seeding if empty (FORCE_SEED=${FORCE_SEED:-0})..."
  npm run db:seed
fi

echo "==> Ensuring Demo / JHS / CHS schools (live JHS names preserved)..."
npm run db:migrate-tenants

echo "==> Syncing sandbox demo passwords (skipping students who set a password)..."
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
# Avoid stale Server Action IDs after image rebuild / hot reload in Docker.
rm -rf /app/.next
exec npx next dev -H 0.0.0.0 -p "$PORT"
