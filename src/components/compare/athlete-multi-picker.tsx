"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { PlayerAvatar } from "@/components/athletes/player-avatar";
import { classYearShort } from "@/lib/grades";
import { cn } from "@/lib/utils";
import type { PickerAthlete } from "@/components/compare/athlete-picker";

const MAX = 5;

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

export function AthleteMultiPicker({
  athletes,
  selectedIds,
  max = MAX,
}: {
  athletes: PickerAthlete[];
  selectedIds: string[];
  max?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const roster = useMemo(() => uniqueById(athletes), [athletes]);
  const selected = selectedIds
    .map((id) => roster.find((a) => a.id === id))
    .filter((a): a is PickerAthlete => Boolean(a));

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

  function commit(ids: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("vs", "athlete");
    params.set("ids", ids.join(","));
    params.delete("student");
    params.delete("b");
    params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((x) => x !== id);
      if (next.length === 0) return;
      commit(next);
      return;
    }
    if (selectedIds.length >= max) return;
    commit([...selectedIds, id]);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-muted">
          Athletes · {selected.length}/{max}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-card-border px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground"
        >
          Add from roster
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {selected.map((a) => (
          <span
            key={a.id}
            className="inline-flex max-w-[14rem] items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-2.5 py-2"
          >
            <PlayerAvatar name={a.name} size="sm" seed={a.id} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{a.name}</span>
              <span className="block text-[10px] uppercase tracking-wide text-muted">
                {a.grade != null ? classYearShort(a.grade) : "—"}
              </span>
            </span>
            {selected.length > 1 && (
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() => toggle(a.id)}
                className="rounded-full p-1 text-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        {selected.length < max && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl border border-dashed border-card-border px-3 py-2 text-sm text-muted hover:border-foreground/40 hover:text-foreground"
          >
            + Add athlete
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
            className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl border border-card-border bg-card shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Compare</p>
                <p className="font-semibold">Pick 2–{max} athletes</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-muted">
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
            <ul className="overflow-y-auto px-2 py-2">
              {filtered.map((a) => {
                const on = selectedIds.includes(a.id);
                const blocked = !on && selectedIds.length >= max;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => toggle(a.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-background/80 disabled:opacity-40",
                        on && "bg-sky-500/15"
                      )}
                    >
                      <PlayerAvatar name={a.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{a.name}</span>
                        <span className="block text-xs text-muted">
                          {a.grade != null ? classYearShort(a.grade) : "—"} · {a.studentNumber}
                        </span>
                      </span>
                      {on && (
                        <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-400">
                          In lineup
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
