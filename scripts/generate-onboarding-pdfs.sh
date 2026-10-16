#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node "$(dirname "$0")/generate-onboarding-pdfs.mjs"
