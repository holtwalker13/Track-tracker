#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building and starting Track Tracker (SQLite lives in the sap-db Docker volume)..."
echo "Open http://localhost:3000 when Ready. Stop any npm run dev on port 3000 first."
docker compose up --build
