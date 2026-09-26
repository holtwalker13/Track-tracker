"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { FilterPills } from "@/components/ui/filter-pills";
import { cn } from "@/lib/utils";

function ClassHourPillsInner({
  classes,
  compact = false,
}: {
  classes: { id: string; name: string; period: string | null }[];
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("classId") ?? "all";
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const options = [
    { id: "all", label: "All hours" },
    ...classes.map((c) => ({
      id: c.id,
      label: c.period ? `${c.period} · ${c.name}` : c.name,
    })),
  ];
  const activeLabel = options.find((o) => o.id === activeId)?.label ?? "All hours";

  function onSelect(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") params.delete("classId");
    else params.set("classId", id);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 border border-card-border bg-card text-left text-sm font-medium",
          "hover:border-sky-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50",
          compact
            ? "max-w-none rounded-lg px-3 py-2"
            : "max-w-md rounded-xl px-4 py-3"
        )}
      >
        <span className="min-w-0 truncate">{activeLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Filter
                </p>
                <h2 id={titleId} className="text-base font-semibold">
                  Class hour / semester
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-card-border text-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="overflow-y-auto p-2" role="listbox" aria-label="Class hour options">
              {options.map((opt) => {
                const active = opt.id === activeId;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => onSelect(opt.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition",
                        active
                          ? "bg-sky-400/15 text-sky-200"
                          : "text-foreground hover:bg-card-border/30"
                      )}
                    >
                      <span className="min-w-0 flex-1 font-medium leading-snug">{opt.label}</span>
                      {active && <Check className="h-4 w-4 shrink-0 text-sky-300" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export function ClassHourPills({
  classes,
  compact = false,
}: {
  classes: { id: string; name: string; period: string | null }[];
  compact?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div
          className={cn(
            "w-full border border-card-border bg-card",
            compact ? "h-9 max-w-none rounded-lg" : "h-12 max-w-md rounded-xl"
          )}
        />
      }
    >
      <ClassHourPillsInner classes={classes} compact={compact} />
    </Suspense>
  );
}

function ParticipationPillsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("type") ?? "all";

  function onSelect(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") params.delete("type");
    else params.set("type", id);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <FilterPills
      pills={[
        { id: "all", label: "All types" },
        { id: "ATHLETE", label: "Athletes" },
        { id: "PE", label: "PE" },
      ]}
      activeId={activeId}
      onSelect={onSelect}
    />
  );
}

export function ParticipationPills() {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <ParticipationPillsInner />
    </Suspense>
  );
}
