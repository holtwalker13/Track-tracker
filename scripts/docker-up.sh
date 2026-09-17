#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Stopping old stack and removing volumes (fixes broken prisma mount from earlier images)..."
docker compose down -v 2>/dev/null || true

echo "Building and starting (logs will stream below)..."
docker compose up --build
