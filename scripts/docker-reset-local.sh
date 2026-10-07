#!/usr/bin/env bash
# Stop every Track Tracker Compose stack and rebuild this repo (fixes stale UI on :3847).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Stopping containers bound to 3847 / 5433 / 5434 ..."
for port in 3847 5433 5434; do
  ids=$(docker ps -q --filter "publish=${port}" 2>/dev/null || true)
  if [ -n "$ids" ]; then
    echo "    Stopping publish=${port}: $ids"
    docker stop $ids >/dev/null
  fi
done

echo "==> docker compose down (this repo) ..."
docker compose down --remove-orphans 2>/dev/null || true

echo "==> Removing app image for this project (force rebuild) ..."
project=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]/-/g')
docker images --format '{{.Repository}}:{{.Tag}}' | grep -E "^${project}-app|^track-tracker" | while read -r img; do
  docker rmi -f "$img" 2>/dev/null || true
done

echo "==> Building with no cache ..."
docker compose build --no-cache

echo "==> Starting ..."
echo "    Current main nav should be: School | Testing | Programs | KPIs | Compete"
echo "    /coach/leaderboards should redirect to /coach/compete/leaderboards"
echo "    Open http://localhost:3847 when Ready."
docker compose up
