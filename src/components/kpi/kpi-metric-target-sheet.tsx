"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { MEDAL_LABELS, MEDALS, type Medal } from "@/lib/kpi-targets";
import { kpiUnitShort } from "@/lib/kpi-display";
import { cn } from "@/lib/utils";

type MetricInfo = {
  slug: string;
  name: string;
  unit: string;
};

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
      className={cn("h-7 w-7", fill, className)}
      aria-hidden
      fill="currentColor"
    >
      <path d="M12 2 14.5 8.5 21 9.5 16 14.5 17.5 21 12 17.5 6.5 21 8 14.5 3 9.5 9.5 8.5 12 2z" />
    </svg>
  );
}

function StepperInput({
  label,
  medal,
  value,
  unit,
  disabled,
  onChange,
}: {
  label: string;
  medal: Medal;
  value: string;
  unit: string;
  disabled?: boolean;
  onChange: (raw: string) => void;
}) {
  const num = value.trim() === "" ? NaN : Number(value);
  const step = unit === "seconds" ? 0.01 : unit === "x BW" ? 0.05 : 1;

  function bump(delta: number) {
    if (disabled) return;
    const base = Number.isFinite(num) ? num : 0;
    const next = Math.max(0, base + delta * step);
    const rounded =
      unit === "seconds" ? String(Number(next.toFixed(3))) : String(Math.round(next * 100) / 100);
    onChange(rounded);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <MedalShield medal={medal} />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div
        className={cn(
          "flex w-full min-h-[3.25rem] items-stretch overflow-hidden rounded-xl border border-card-border bg-background",
          disabled && "opacity-45"
        )}
      >
        <input
          type="number"
          inputMode="decimal"
          step="any"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-center font-display text-xl font-bold tabular-nums text-foreground outline-none"
          aria-label={`${label} target`}
        />
        <div className="flex flex-col border-l border-card-border">
          <button
            type="button"
            disabled={disabled}
            onClick={() => bump(1)}
            className="flex flex-1 items-center justify-center px-2.5 text-muted hover:bg-elevated hover:text-foreground disabled:pointer-events-none"
            aria-label={`Increase ${label}`}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => bump(-1)}
            className="flex flex-1 items-center justify-center border-t border-card-border px-2.5 text-muted hover:bg-elevated hover:text-foreground disabled:pointer-events-none"
            aria-label={`Decrease ${label}`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
      <span className="text-xs font-medium text-muted">{kpiUnitShort(unit)}</span>
    </div>
  );
}

export function KpiMetricTargetSheet({
  metric,
  ranked,
  readValue,
  onApply,
  onClose,
  onSave,
  saving,
}: {
  metric: MetricInfo;
  ranked: boolean;
  readValue: (medal: Medal) => string;
  onApply: (medal: Medal, raw: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
}) {
  const [draft, setDraft] = useState<Record<Medal, string>>(() => ({
    gold: readValue("gold"),
    silver: readValue("silver"),
    bronze: readValue("bronze"),
  }));

  useEffect(() => {
    setDraft({
      gold: readValue("gold"),
      silver: readValue("silver"),
      bronze: readValue("bronze"),
    });
  }, [metric.slug]);

  function handleSave() {
    for (const medal of MEDALS) {
      onApply(medal, draft[medal]);
    }
    onSave();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-metric-sheet-title"
        className="relative z-10 max-h-[88vh] w-full overflow-hidden rounded-t-3xl border border-card-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-card-border px-4 py-4">
          <div className="min-w-0">
            <h2 id="kpi-metric-sheet-title" className="font-display text-xl font-bold tracking-tight">
              Edit {metric.name}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Update medal thresholds for {metric.name} only
              {!ranked ? " · unranked (enable ranked to set targets)" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-card-border text-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-5">
          <div className="flex gap-3">
            {MEDALS.map((medal) => (
              <StepperInput
                key={medal}
                medal={medal}
                label={MEDAL_LABELS[medal]}
                unit={metric.unit}
                disabled={!ranked}
                value={draft[medal]}
                onChange={(raw) => setDraft((d) => ({ ...d, [medal]: raw }))}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 border-t border-card-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[3rem] flex-1 rounded-xl border border-card-border bg-background px-4 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !ranked}
            className="btn-primary min-h-[3rem] flex-1 rounded-xl px-4 text-sm font-bold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
