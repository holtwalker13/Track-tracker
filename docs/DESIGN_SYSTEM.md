# Design system (Track Tracker)

Product tone: **70% professional sports analytics**, **20% premium athletic branding**, **10% gamification**.

## Principles

1. **Dark-first, not dark-only** — `data-theme="dark"|"light"` on `<html>`; toggle in app header. Light mode for outdoor testing and bright gyms.
2. **One dominant accent** — lime `#C6F54A` (`--accent`). Use for primary actions, selected nav, key achievements. Semantic colors (gold/silver/bronze medals, success/warning/danger) carry meaning only.
3. **Numbers before decoration** — hero metrics use `.text-hero-metric` / `.text-card-kpi` (Barlow Condensed). UI chrome uses Inter.
4. **Consistent metric semantics** — format via `formatActivityValue` / `formatKpiTargetValue`; direction from unit defaults in `KPI_UNITS`.
5. **Progressive disclosure** — summary cards first; detail sheets (e.g. mobile KPI target editor) on demand.
6. **Field-ready** — min ~44px touch targets, sticky save bars on mobile KPI flows, visible save confirmation toast.

## Tokens

Defined in `src/app/globals.css`:

| Token | Dark | Role |
|-------|------|------|
| `--background` | `#101214` | App canvas |
| `--card` | `#1E2226` | Cards |
| `--elevated` | `#2A2F34` | Raised surfaces |
| `--accent` | `#C6F54A` | Primary CTA / selection |
| `--foreground` | `#F5F7F8` | Body text |
| `--muted` | `#A3ABB3` | Secondary text |
| `--success` / `--danger` / `--warning` | mint / coral / gold | Trend & status only |

## Typography scale (reference)

| Element | Size | Weight |
|---------|------|--------|
| Hero metric | 48–72px | 700–800 (display) |
| Card KPI | 28–36px | 700 |
| Screen heading | 24–30px | 700 |
| Body | 14–16px | 400–500 |

Fonts: **Barlow Condensed** (`--font-barlow`), **Inter** (`--font-inter`).

## Coach KPI mobile

`/coach/benchmarks` uses `KpiTargetsMobile` below `lg` breakpoint: KPI vs Lift tabs, target preview carousel, bottom sheet per metric (`KpiMetricTargetSheet`).
