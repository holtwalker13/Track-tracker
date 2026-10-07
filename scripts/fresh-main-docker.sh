#!/usr/bin/env bash
# Fresh checkout of main + no-cache Docker rebuild (fixes stale app on :3847).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Fetching origin/main..."
git fetch origin main
git checkout main
git reset --hard origin/main
git clean -fdx -e .env

echo "==> Stopping stack and removing old images for this project..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache

echo "==> Starting (Postgres volume kept; add -v before up to wipe DB)..."
echo "    Open http://localhost:3847 when logs show Ready."
docker compose up
