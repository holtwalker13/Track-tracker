"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { classSectionLabel } from "@/lib/periods";
import { AGE_BRACKETS, type AgeBracketId } from "@/lib/age-brackets";

type ClassTag = { id: string; name: string; period: string | null };

function MedalScopeControlsInner({
  classes,
  defaultBracket,
}: {
  classes: ClassTag[];
  defaultBracket: AgeBracketId;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const classId = searchParams.get("classId") ?? "";
  const bracketParam = searchParams.get("bracket");
  const bracket =
    AGE_BRACKETS.some((b) => b.id === bracketParam) ? (bracketParam as AgeBracketId) : defaultBracket;
  const window = searchParams.get("window") === "week" ? "week" : "all";

  function push(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="mb-3 space-y-2.5 sm:mb-4 sm:space-y-3">
      {classes.length > 0 ? (
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Period / activity
          </span>
          <select
            value={classId}
            onChange={(e) => push({ classId: e.target.value || null })}
            className="mt-1 w-full max-w-md rounded-xl border border-card-border bg-card px-3 py-2.5 text-sm"
          >
            <option value="">All my periods</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {classSectionLabel(c)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Age bracket</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AGE_BRACKETS.map((b) => {
            const active = bracket === b.id;
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  push({ bracket: b.id === defaultBracket ? null : b.id })
                }
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/55"
                    : "border border-card-border text-muted hover:border-sky-400/40 hover:text-sky-200"
                )}
              >
                {b.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Time</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: "All-time" },
              { id: "week", label: "This week" },
            ] as const
          ).map((opt) => {
            const active = window === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => push({ window: opt.id === "all" ? null : opt.id })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/55"
                    : "border border-card-border text-muted hover:border-sky-400/40 hover:text-sky-200"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MedalScopeControls(props: {
  classes: ClassTag[];
  defaultBracket: AgeBracketId;
}) {
  return (
    <Suspense fallback={<div className="mb-4 h-24 animate-pulse rounded-xl bg-card/40" />}>
      <MedalScopeControlsInner {...props} />
    </Suspense>
  );
}
