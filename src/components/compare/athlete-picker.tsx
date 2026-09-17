"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { PlayerAvatar } from "@/components/athletes/player-avatar";
import { classYearShort } from "@/lib/grades";
import { cn } from "@/lib/utils";

export type PickerAthlete = {
  id: string;
  name: string;
  studentNumber: string;
  grade?: number | null;
};

function uniqueById(athletes: PickerAthlete[]): PickerAthlete[] {
  const seen = new Set<string>();
  const out: PickerAthlete[] = [];
  for (const a of athletes) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

function labelFor(a: PickerAthlete) {
  const grade = a.grade != null ? classYearShort(a.grade) : null;
  return [a.name, grade].filter(Boolean).join(" · ");
}

function Chip({
  athlete,
  active,
  accent,
  onClick,
}: {
  athlete: PickerAthlete;
  active?: boolean;
  accent: "sky" | "amber";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex max-w-[11rem] items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
        active && accent === "sky" && "border-sky-500 bg-sky-500 text-white",
        active && accent === "amber" && "border-amber-400 bg-amber-400 text-background",
        !active && "border-card-border bg-card hover:border-foreground/30"
      )}
    >
      <PlayerAvatar name={athlete.name} size="sm" seed={athlete.id} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{athlete.name}</span>
        <span
          className={cn(
            "block truncate text-[10px] uppercase tracking-wide",
            active ? "opacity-80" : "text-muted"
          )}
        >
          {athlete.grade != null ? classYearShort(athlete.grade) : "—"} · {athlete.studentNumber}
        </span>
      </span>
    </button>
  );
}

export function AthletePicker({
  label,
  athletes,
  selectedId,
  excludeIds = [],
  param,
  accent = "sky",
  quickCount = 3,
}: {
  label: string;
  athletes: PickerAthlete[];
  selectedId?: string;
  excludeIds?: string[];
  param: "student" | "b";
  accent?: "sky" | "amber";
  quickCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const roster = useMemo(() => {
    const excluded = new Set(excludeIds);
    return uniqueById(athletes).filter((a) => !excluded.has(a.id));
  }, [athletes, excludeIds]);

  const selected = roster.find((a) => a.id === selectedId) ?? roster[0];

  const quick = useMemo(() => {
    if (!selected) return [];
    const rest = roster.filter((a) => a.id !== selected.id).slice(0, quickCount);
    return [selected, ...rest];
  }, [roster, selected, quickCount]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.studentNumber.toLowerCase().includes(q) ||
        String(a.grade ?? "").includes(q)
    );
  }, [roster, query]);

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.set(param, id);
    if (param === "student" && params.get("b") === id) {
      params.delete("b");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!selected) {
    return (
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">{label}</p>
        <p className="text-sm text-muted">No athletes in this filter.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-card-border px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground"
        >
          Browse roster
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {quick.map((a) => (
          <Chip
            key={a.id}
            athlete={a}
            active={a.id === selected.id}
            accent={accent}
            onClick={() => select(a.id)}
          />
        ))}
        {roster.length > quick.length && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl border border-dashed border-card-border px-3 py-2 text-sm text-muted hover:border-foreground/40 hover:text-foreground"
          >
            +{roster.length - quick.length} more
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Select ${label}`}
            className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl border border-card-border bg-card shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
                <p className="font-semibold">Choose athlete</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-muted hover:bg-background hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-card-border px-4 py-3">
              <label className="flex items-center gap-2 rounded-lg border border-card-border bg-background px-3 py-2">
                <Search className="h-4 w-4 text-muted" aria-hidden />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, class, or ID"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
            </div>

            <ul className="overflow-y-auto overscroll-contain px-2 py-2">
              {filtered.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-muted">No matches</li>
              ) : (
                filtered.map((a) => {
                  const active = a.id === selected.id;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => select(a.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-background/80",
                          active && "bg-background"
                        )}
                      >
                        <PlayerAvatar name={a.name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{a.name}</span>
                          <span className="block text-xs text-muted">{labelFor(a)} · {a.studentNumber}</span>
                        </span>
                        {active && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                              accent === "sky" ? "bg-sky-500/20 text-sky-400" : "bg-amber-400/20 text-amber-300"
                            )}
                          >
                            Selected
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
