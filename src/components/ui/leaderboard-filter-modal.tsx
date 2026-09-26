"use client";

import { useEffect, useId, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GRADE_LEVELS, classYearShort, parseGradesParam } from "@/lib/grades";
import { classSectionLabel } from "@/lib/periods";

type ClassOption = { id: string; name: string; period: string | null };

function LeaderboardFilterModalInner({
  classes,
  showGender = true,
  lockGenderLabel,
}: {
  classes: ClassOption[];
  showGender?: boolean;
  /** When gender is locked (student), show as read-only hint. */
  lockGenderLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const grades = parseGradesParam(searchParams.get("grades") ?? searchParams.get("grade"));
  const gender = searchParams.get("gender") === "M" ? "M" : searchParams.get("gender") === "F" ? "F" : "F";
  const scope = searchParams.get("scope") === "global" ? "global" : "school";
  const classId = searchParams.get("classId") ?? "";

  const activeCount =
    (grades.length < GRADE_LEVELS.length ? 1 : 0) +
    (classId ? 1 : 0) +
    (scope === "global" ? 1 : 0) +
    (showGender && searchParams.get("gender") === "M" ? 1 : 0);

  function push(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
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
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium",
          activeCount > 0
            ? "border-sky-400/50 bg-sky-400/10 text-sky-200"
            : "border-card-border text-muted hover:text-foreground"
        )}
      >
        <Filter className="h-4 w-4" aria-hidden />
        Filters
        {activeCount > 0 ? (
          <span className="rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close filters"
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
              <h2 id={titleId} className="font-semibold">
                Leaderboard filters
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Scope
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "school", label: "School" },
                      { id: "global", label: "Global" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={scope === opt.id}
                      onClick={() =>
                        push({ scope: opt.id === "school" ? null : opt.id })
                      }
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-medium",
                        scope === opt.id
                          ? "bg-sky-500 text-white"
                          : "border border-card-border text-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {showGender ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Gender
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: "F", label: "Girls" },
                        { id: "M", label: "Boys" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={gender === opt.id}
                        onClick={() =>
                          push({ gender: opt.id === "F" ? null : opt.id })
                        }
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm font-medium",
                          gender === opt.id
                            ? "bg-sky-500 text-white"
                            : "border border-card-border text-muted"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : lockGenderLabel ? (
                <p className="text-sm text-muted">
                  Gender locked to {lockGenderLabel.toLowerCase()}
                </p>
              ) : null}

              {classes.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    PE / period
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={!classId}
                      onClick={() => push({ classId: null })}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm",
                        !classId
                          ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/55"
                          : "border border-card-border text-muted"
                      )}
                    >
                      Entire school
                    </button>
                    {classes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={classId === c.id}
                        onClick={() => push({ classId: c.id })}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-sm",
                          classId === c.id
                            ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/55"
                            : "border border-card-border text-muted"
                        )}
                      >
                        {classSectionLabel(c)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Graduation year
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={grades.length === GRADE_LEVELS.length}
                    onClick={() => push({ grades: null, grade: null })}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm",
                      grades.length === GRADE_LEVELS.length
                        ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/55"
                        : "border border-card-border text-muted"
                    )}
                  >
                    All
                  </button>
                  {GRADE_LEVELS.map((y) => {
                    const on = grades.includes(y) && grades.length < GRADE_LEVELS.length;
                    return (
                      <button
                        key={y}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          let next: number[];
                          if (grades.length === GRADE_LEVELS.length) next = [y];
                          else if (grades.includes(y)) {
                            next = grades.filter((g) => g !== y);
                            if (next.length === 0) next = [...GRADE_LEVELS];
                          } else next = [...grades, y].sort((a, b) => a - b);
                          push({
                            grades:
                              next.length === GRADE_LEVELS.length
                                ? null
                                : next.join(","),
                            grade: null,
                          });
                        }}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-sm",
                          on
                            ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/55"
                            : "border border-card-border text-muted"
                        )}
                      >
                        {classYearShort(y)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-card-border px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-background"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function LeaderboardFilterModal(props: {
  classes: ClassOption[];
  showGender?: boolean;
  lockGenderLabel?: string;
}) {
  return (
    <Suspense fallback={<div className="h-9 w-24 animate-pulse rounded-full bg-card/40" />}>
      <LeaderboardFilterModalInner {...props} />
    </Suspense>
  );
}
