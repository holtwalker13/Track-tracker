"use client";

import { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { AddStudentForm } from "@/components/athletes/add-student-form";
import { ClassHourPills, ParticipationPills } from "@/components/athletes/roster-filters";
import {
  GRADE_LEVELS,
  classYearShort,
  gradesLabel,
  parseGradesParam,
} from "@/lib/grades";
import { genderFullLabel, parseGenderParam } from "@/lib/gender";
import { cn } from "@/lib/utils";

export type RosterSearchEntry = {
  studentId: string;
  fullName: string;
  studentNumber: string;
  sports: string | null;
  className: string | null;
  classYear: number | null;
};

function useDebouncedCallback<T extends (...args: never[]) => void>(fn: T, ms: number) {
  const ref = useRef(fn);
  ref.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => ref.current(...args), ms);
    },
    [ms]
  );
}

function activeFilterCount(searchParams: URLSearchParams): number {
  let n = 0;
  const grades = parseGradesParam(searchParams.get("grades"));
  if (grades.length !== GRADE_LEVELS.length) n += 1;
  if (searchParams.get("classId")) n += 1;
  if (searchParams.get("type")) n += 1;
  if (parseGenderParam(searchParams.get("gender")) === "M") n += 1;
  return n;
}

function RosterToolbarInner({
  searchPool,
  hourClasses,
  resultCount,
}: {
  searchPool: RosterSearchEntry[];
  hourClasses: { id: string; name: string; period: string | null }[];
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dialogTitleId = useId();

  const qParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(qParam);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => setQuery(qParam), [qParam]);

  const pushQuery = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, 220);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return searchPool.slice(0, 8);
    return searchPool
      .filter((a) => {
        const hay = [
          a.fullName,
          a.studentNumber,
          a.sports ?? "",
          a.className ?? "",
          a.classYear != null ? classYearShort(a.classYear) : "",
          a.classYear != null ? String(a.classYear) : "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [query, searchPool]);

  function pickSuggestion(entry: RosterSearchEntry) {
    setQuery(entry.fullName);
    setSuggestOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", entry.fullName);
    const qs = params.toString();
    router.push(`${pathname}?${qs}`);
  }

  function clearSearch() {
    setQuery("");
    setSuggestOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    inputRef.current?.focus();
  }

  const filterCount = activeFilterCount(searchParams);
  const grades = parseGradesParam(searchParams.get("grades"));
  const gender = parseGenderParam(searchParams.get("gender"));

  useEffect(() => {
    if (!filtersOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen]);

  return (
    <>
      <div className="relative flex w-full items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={suggestOpen && suggestions.length > 0}
            aria-controls="roster-search-suggestions"
            placeholder="Search name, ID, sport, or class"
            className="w-full rounded-lg border border-card-border bg-background py-2.5 pl-9 pr-9 text-sm"
            onFocus={() => setSuggestOpen(true)}
            onBlur={(e) => {
              if (listRef.current?.contains(e.relatedTarget as Node)) return;
              setTimeout(() => setSuggestOpen(false), 120);
            }}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              setSuggestOpen(true);
              pushQuery(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSuggestOpen(false);
                inputRef.current?.blur();
              }
            }}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {suggestOpen && suggestions.length > 0 && (
            <ul
              id="roster-search-suggestions"
              ref={listRef}
              role="listbox"
              className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-card-border bg-card py-1 shadow-xl"
            >
              {suggestions.map((s) => (
                <li key={s.studentId} role="option">
                  <button
                    type="button"
                    className="flex w-full flex-col items-start px-3 py-2.5 text-left text-sm hover:bg-sky-400/10"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(s)}
                  >
                    <span className="font-medium">{s.fullName}</span>
                    <span className="text-xs text-muted">
                      #{s.studentNumber}
                      {s.classYear != null ? ` · ${classYearShort(s.classYear)}` : ""}
                      {s.className ? ` · ${s.className}` : ""}
                      {s.sports ? ` · ${s.sports}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          className={cn(
            "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-card-border bg-card",
            "hover:border-sky-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50",
            filterCount > 0 && "border-sky-400/50 bg-sky-400/10"
          )}
          aria-label={filterCount > 0 ? `Filters (${filterCount} active)` : "Filters"}
        >
          <Filter className="h-5 w-5" aria-hidden />
          {filterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-muted md:hidden">
        {gradesLabel(grades)} · {genderFullLabel(gender)} · {resultCount} students
      </p>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setFiltersOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-card-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Roster
                </p>
                <h2 id={dialogTitleId} className="text-base font-semibold">
                  Filters
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-card-border text-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto px-4 py-4">
              <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Graduating class
                </p>
                <GradePills />
              </section>
              <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Class hour / semester section
                </p>
                <ClassHourPills classes={hourClasses} />
              </section>
              <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Tracking type
                </p>
                <ParticipationPills />
              </section>
              <section>
                <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Gender
                </p>
                <GenderToggle />
              </section>
            </div>

            <div className="space-y-3 border-t border-card-border p-4">
              <AddStudentForm classes={hourClasses} />
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-background"
              >
                Show {resultCount} students
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function RosterToolbar(props: {
  searchPool: RosterSearchEntry[];
  hourClasses: { id: string; name: string; period: string | null }[];
  resultCount: number;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex gap-2">
          <div className="h-11 flex-1 rounded-lg border border-card-border bg-background" />
          <div className="h-11 w-11 rounded-lg border border-card-border bg-card" />
        </div>
      }
    >
      <RosterToolbarInner {...props} />
    </Suspense>
  );
}

/** Desktop-only filter stack (unchanged layout for md+). */
export function RosterFiltersDesktop({
  hourClasses,
  resultCount,
  grades,
  gender,
}: {
  hourClasses: { id: string; name: string; period: string | null }[];
  resultCount: number;
  grades: number[];
  gender: string;
}) {
  return (
    <div className="mb-8 hidden space-y-5 md:block">
      <div>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Graduating class
        </p>
        <div className="flex justify-center">
          <GradePills />
        </div>
      </div>
      <div>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Class hour / semester section
        </p>
        <div className="flex justify-center">
          <ClassHourPills classes={hourClasses} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Tracking type
        </p>
        <div className="flex justify-center">
          <ParticipationPills />
        </div>
      </div>
      <GenderToggle />
      <p className="text-center text-sm text-muted">
        {gradesLabel(grades)} · {genderFullLabel(gender)} · {resultCount} students
      </p>
    </div>
  );
}
