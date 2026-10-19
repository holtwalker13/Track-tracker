"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Copy,
  FileText,
  MoreVertical,
  Plus,
  Target,
  Dumbbell,
} from "lucide-react";
import { ActivityIcon } from "@/lib/activity-icons";
import { MEDALS, type Medal } from "@/lib/kpi-targets";
import { AGE_BRACKETS, type AgeBracketId } from "@/lib/age-brackets";
import { formatKpiTargetValue } from "@/lib/kpi-display";
import { KpiMetricTargetSheet } from "@/components/kpi/kpi-metric-target-sheet";
import { sportLabel } from "@/lib/sports";
import { cn } from "@/lib/utils";
type MetricInfo = {
  slug: string;
  name: string;
  unit: string;
  categorySlug?: string;
  custom?: boolean;
};

type ActiveSetInfo = {
  id: string;
  name: string;
  sport: string;
  isPublic: boolean;
  isDefault: boolean;
};

function shortMetricName(name: string): string {
  return name
    .replace(/ \(CMJ\)/i, "")
    .replace(/1RM \/ BW/i, "/ BW")
    .replace(/Flying 10 m/i, "Fly 10m")
    .replace(/Standing Broad Jump/i, "Broad Jump");
}

function MedalShield({ medal, className }: { medal: Medal; className?: string }) {
  const fill =
    medal === "gold"
      ? "text-sport-gold"
      : medal === "silver"
        ? "text-sport-silver"
        : "text-sport-bronze";
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", fill, className)}
      aria-hidden
      fill="currentColor"
    >
      <path d="M12 2 14.5 8.5 21 9.5 16 14.5 17.5 21 12 17.5 6.5 21 8 14.5 3 9.5 9.5 8.5 12 2z" />
    </svg>
  );
}

export function KpiTargetsMobile({
  visibleMetrics,
  rankedBySlug,
  value,
  setValue,
  toggleRanked,
  gender,
  setGender,
  bracket,
  setBracket,
  activeSet,
  classScopeMode,
  classScopeLabel,
  ownSets,
  activateSet,
  rankedCount,
  onBuildKpi,
  onBuildLift,
  onUseTemplate,
  onDuplicateSet,
  onBrowseSets,
  onTogglePublic,
  onSave,
  saveStatus,
}: {
  visibleMetrics: MetricInfo[];
  rankedBySlug: Record<string, boolean>;
  value: (slug: string, medal: Medal) => string;
  setValue: (slug: string, medal: Medal, raw: string) => void;
  toggleRanked: (slug: string) => void;
  gender: "F" | "M";
  setGender: (g: "F" | "M") => void;
  bracket: AgeBracketId;
  setBracket: (b: AgeBracketId) => void;
  activeSet: ActiveSetInfo | null;
  classScopeMode: boolean;
  classScopeLabel: string | null;
  ownSets: ActiveSetInfo[];
  activateSet: (id: string) => void;
  rankedCount: number;
  onBuildKpi: () => void;
  onBuildLift: () => void;
  onUseTemplate: () => void;
  onDuplicateSet: () => void;
  onBrowseSets: () => void;
  onTogglePublic: () => void;
  onSave: () => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
}) {
  const [targetTab, setTargetTab] = useState<"kpi" | "lift">("kpi");
  const [sheetMetric, setSheetMetric] = useState<MetricInfo | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePreview, setActivePreview] = useState<string | null>(null);

  const tabMetrics = useMemo(() => {
    const list =
      targetTab === "lift"
        ? visibleMetrics.filter((m) => m.categorySlug === "strength")
        : visibleMetrics.filter((m) => m.categorySlug !== "strength");
    return list.filter((m) => rankedBySlug[m.slug]);
  }, [targetTab, visibleMetrics, rankedBySlug]);

  const previewMetrics = tabMetrics.length > 0 ? tabMetrics : visibleMetrics.filter((m) => rankedBySlug[m.slug]);

  const setTitle =
    classScopeMode && classScopeLabel
      ? classScopeLabel
      : activeSet
        ? `${activeSet.name}${activeSet.isDefault ? " · Default" : ""}`
        : "No KPI set";

  return (
    <div className="space-y-4 pb-24">
      <div className="flex gap-2 border-b border-card-border pb-1">
        <button
          type="button"
          onClick={() => setTargetTab("kpi")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition",
            targetTab === "kpi"
              ? "border-accent text-accent"
              : "border-transparent text-muted"
          )}
        >
          <Target className="h-4 w-4" aria-hidden />
          KPI Targets
        </button>
        <button
          type="button"
          onClick={() => setTargetTab("lift")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition",
            targetTab === "lift"
              ? "border-accent text-accent"
              : "border-transparent text-muted"
          )}
        >
          <Dumbbell className="h-4 w-4" aria-hidden />
          Lift Targets
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={targetTab === "lift" ? onBuildLift : onBuildKpi}
          className="btn-primary flex min-h-[4.5rem] min-w-[7.5rem] shrink-0 flex-col items-start justify-between rounded-2xl px-3 py-3 text-left shadow-[0_0_24px_rgba(198,245,74,0.15)]"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          <span>
            <span className="block text-sm font-bold">Build Targets</span>
            <span className="block text-[11px] font-medium opacity-80">Gold / Silver / Bronze</span>
          </span>
          <ChevronRight className="h-4 w-4 self-end opacity-70" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onUseTemplate}
          className="flex min-h-[4.5rem] min-w-[6.5rem] shrink-0 flex-col items-start justify-between rounded-2xl border border-card-border bg-card px-3 py-3 text-left"
        >
          <FileText className="h-5 w-5 text-muted" aria-hidden />
          <span className="text-sm font-semibold">Use Template</span>
          <span className="text-[11px] text-muted">Start from a preset</span>
        </button>
        <button
          type="button"
          onClick={onDuplicateSet}
          className="flex min-h-[4.5rem] min-w-[6.5rem] shrink-0 flex-col items-start justify-between rounded-2xl border border-card-border bg-card px-3 py-3 text-left"
        >
          <Copy className="h-5 w-5 text-muted" aria-hidden />
          <span className="text-sm font-semibold">Duplicate Set</span>
          <span className="text-[11px] text-muted">Copy from another</span>
        </button>
      </div>

      <div className="rounded-2xl border border-card-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Active KPI set</p>
          {activeSet?.isPublic ? (
            <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
              Public
            </span>
          ) : (
            <span className="rounded-md bg-elevated px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              Private
            </span>
          )}
        </div>
        <p className="font-display text-lg font-bold leading-tight">{setTitle}</p>
        {activeSet && !classScopeMode ? (
          <p className="mt-0.5 text-xs text-muted">{sportLabel(activeSet.sport)}</p>
        ) : null}
        <p className="mt-2 text-xs text-muted">
          {rankedCount} ranked · {gender === "F" ? "Girls" : "Boys"} ·{" "}
          {AGE_BRACKETS.find((b) => b.id === bracket)?.shortLabel ?? bracket}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!classScopeMode ? (
            <button
              type="button"
              onClick={() => setSwitchOpen(true)}
              className="min-h-[2.75rem] rounded-xl border border-card-border px-4 text-sm font-semibold"
            >
              Switch
            </button>
          ) : null}
          <button
            type="button"
            onClick={onBrowseSets}
            className="min-h-[2.75rem] rounded-xl border border-card-border px-4 text-sm font-semibold"
          >
            Browse Sets
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-xl border border-card-border"
            aria-label="More actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
        {menuOpen ? (
          <div className="mt-2 flex flex-col gap-1 rounded-xl border border-card-border bg-background p-2">
            <button
              type="button"
              onClick={() => {
                onTogglePublic();
                setMenuOpen(false);
              }}
              className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-elevated"
            >
              {activeSet?.isPublic ? "Make private" : "Make public"}
            </button>
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Target preview</p>
        {previewMetrics.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sm text-muted">
            No ranked {targetTab === "lift" ? "lifts" : "KPIs"} in this age band. Mark metrics as ranked or
            build new targets.
          </p>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {previewMetrics.map((meta) => {
                const selected = activePreview === meta.slug;
                const hasAny = MEDALS.some((medal) => value(meta.slug, medal).trim() !== "");
                return (
                  <button
                    key={meta.slug}
                    type="button"
                    onClick={() => {
                      setActivePreview(meta.slug);
                      setSheetMetric(meta);
                    }}
                    className={cn(
                      "flex w-[11.5rem] min-w-[11.5rem] shrink-0 snap-start flex-col rounded-2xl border bg-card p-3.5 text-left transition",
                      selected ? "border-accent ring-1 ring-accent/40" : "border-card-border"
                    )}
                  >
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-elevated">
                      <ActivityIcon slug={meta.slug} categorySlug={meta.categorySlug} className="h-5 w-5" tone="inherit" />
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold leading-tight">
                      {shortMetricName(meta.name)}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {MEDALS.map((medal) => {
                        const raw = value(meta.slug, medal);
                        const num = raw.trim() === "" ? null : Number(raw);
                        const display =
                          num != null && Number.isFinite(num)
                            ? formatKpiTargetValue(num, meta.unit, meta.slug, meta.name)
                            : "—";
                        return (
                          <div key={medal} className="flex min-w-0 flex-col items-center gap-1 px-0.5">
                            <MedalShield medal={medal} className="h-4 w-4 shrink-0" />
                            <span className="w-full truncate text-center text-[11px] font-bold tabular-nums leading-tight text-foreground">
                              {display}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {!hasAny ? (
                      <span className="mt-2 text-[10px] font-medium text-muted">Tap to set</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-center gap-1.5">
              {previewMetrics.slice(0, 6).map((m, i) => (
                <span
                  key={m.slug}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    activePreview === m.slug || (!activePreview && i === 0)
                      ? "bg-accent"
                      : "bg-card-border"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Age & gender</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {AGE_BRACKETS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBracket(b.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-sm font-semibold",
                bracket === b.id
                  ? "bg-accent/15 text-accent ring-1 ring-accent/45"
                  : "border border-card-border text-muted"
              )}
            >
              {b.shortLabel}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-elevated p-1">
          {(
            [
              { id: "F" as const, label: "Girls" },
              { id: "M" as const, label: "Boys" },
            ] as const
          ).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGender(g.id)}
              className={cn(
                "min-h-[2.75rem] rounded-lg text-sm font-bold",
                gender === g.id ? "btn-primary shadow-sm" : "text-muted"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {switchOpen ? (
        <div className="fixed inset-0 z-[55] flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/55"
            onClick={() => setSwitchOpen(false)}
          />
          <div className="relative z-10 max-h-[70vh] w-full overflow-hidden rounded-t-3xl border border-card-border bg-card">
            <div className="border-b border-card-border px-4 py-3 font-display text-lg font-bold">Switch KPI set</div>
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-card-border">
              {ownSets.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      activateSet(s.id);
                      setSwitchOpen(false);
                    }}
                    className="flex w-full flex-col px-4 py-3 text-left hover:bg-elevated"
                  >
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs text-muted">
                      {sportLabel(s.sport)}
                      {s.isDefault ? " · default" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {sheetMetric ? (
        <KpiMetricTargetSheet
          metric={sheetMetric}
          ranked={Boolean(rankedBySlug[sheetMetric.slug])}
          readValue={(medal) => value(sheetMetric.slug, medal)}
          onApply={(medal, raw) => setValue(sheetMetric.slug, medal, raw)}
          onClose={() => setSheetMetric(null)}
          onSave={() => {
            if (!rankedBySlug[sheetMetric.slug]) {
              toggleRanked(sheetMetric.slug);
            }
            onSave();
            setSheetMetric(null);
          }}
          saving={saveStatus === "saving"}
        />
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-card-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="button"
          onClick={onSave}
          disabled={saveStatus === "saving"}
          className="btn-primary flex min-h-[3rem] w-full items-center justify-center rounded-xl text-sm font-bold"
        >
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save KPI set"}
        </button>
      </div>
    </div>
  );
}
