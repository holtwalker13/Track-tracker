# User Flow Explorer (internal)

Web-based map of Track Tracker routes, navigation edges, and mobile screenshots for UX review.

## Access

- URL: `/internal/user-flows`
- **ADMIN role only** (same session cookie as the main app). Not linked from public nav.

## Refresh workflow

```bash
# 1. Regenerate graph from App Router pages + static nav/href analysis
npm run user-flows:scan

# 2. Optional: capture 390×844 screenshots (app must be running, demo DB seeded)
docker compose up -d   # or npm run dev
npm run user-flows:capture

# 3. Re-scan to attach screenshot paths
npm run user-flows:scan
```

Layout positions persist in `data/user-flow-explorer/layout.json` via the canvas (admin API).

## What is auto-discovered vs manual review

| Verified automatically | Requires manual review |
|------------------------|-------------------------|
| App Router `page.tsx` routes | Dynamic segments (`:sessionId`, etc.) |
| `COACH_NAV`, `STUDENT_NAV`, hub tabs | Modal-only states (`CoachModal`, filter dialogs) |
| Redirect pages | Form submit → API → redirect chains |
| `href` / `redirect()` in each `page.tsx` | Component-level links not imported into pages |
| Auth gates (inferred) | Role-specific conditional UI |

## Modules

| Path | Role |
|------|------|
| `src/lib/user-flow-explorer/*` | Types, discovery, edges, audit, pathfinding |
| `scripts/user-flow-explorer/generate-graph.ts` | CLI scanner |
| `scripts/user-flow-explorer/capture-screenshots.ts` | Playwright mobile capture |
| `data/user-flow-explorer/graph.json` | Generated graph (committed) |
| `src/components/user-flow-explorer/*` | React Flow canvas UI |

## Security

- Screenshot API and layout API require ADMIN session.
- Capture script uses demo credentials (`rekcart`) and sanitized demo tenants only.
- Do not expose this tool in production without equivalent access controls.
