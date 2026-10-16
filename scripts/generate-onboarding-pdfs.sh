#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# Uses Playwright's bundled Chromium (no system Chrome required).
npx --yes -p playwright@1.49.1 node "$(dirname "$0")/generate-onboarding-pdfs.mjs"
