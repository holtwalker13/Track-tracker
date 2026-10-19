"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useMedalClassNavigation } from "@/components/athletes/medal-class-navigation";
import { medalClassPickerLines } from "@/lib/periods";
import { cn } from "@/lib/utils";

export type AthleteProfileClassPickerProps = {
  classes: { id: string; name: string; period: string | null }[];
  selectedClassId: string | null;
  /** Subgroups within each class — enables the subgroup KPI viewer. */
  subgroupsByClassId?: Record<string, { id: string; name: string }[]>;
  selectedSubgroupId?: string | null;
  /** Athlete's subgroup when URL has no subgroupId (matches student dashboard default). */
  defaultSubgroupId?: string | null;
  /** Renders inside the athlete profile card (border-top footer). */
  embedded?: boolean;
};

export function AthleteProfileClassPicker({
  classes,
  selectedClassId,
  subgroupsByClassId = {},
  selectedSubgroupId = null,
  defaultSubgroupId = null,
  embedded = false,
}: AthleteProfileClassPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { beginMedalScopeReload, pending: scopePending } = useMedalClassNavigation();

  if (classes.length === 0) return null;

  const subgroups = (selectedClassId && subgroupsByClassId[selectedClassId]) || [];
  const hasSubgroupParam = searchParams.has("subgroupId");
  const subgroupParam = searchParams.get("subgroupId");
  const subgroupSelectValue = hasSubgroupParam
    ? subgroupParam === "" || subgroupParam === null
      ? "__whole__"
      : (selectedSubgroupId ?? "")
    : subgroups.some((s) => s.id === defaultSubgroupId)
      ? (defaultSubgroupId ?? "")
      : "";

  function pick(classId: string, subgroupRaw: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (classId) params.set("classId", classId);
    else params.delete("classId");
    if (subgroupRaw === "__whole__") params.set("subgroupId", "");
    else if (subgroupRaw) params.set("subgroupId", subgroupRaw);
    else params.delete("subgroupId");
    beginMedalScopeReload();
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  const activeClassId = selectedClassId ?? classes[0]?.id ?? "";

  return (
    <div
      className={cn(
        embedded
          ? "mt-5 border-t border-card-border/80 pt-4"
          : "mb-4 flex flex-wrap items-end gap-4",
        (pending || scopePending) && "opacity-80"
      )}
    >
      <div className={cn(!embedded && "flex flex-wrap items-end gap-4", embedded && "space-y-3")}>
        <div className={embedded ? "w-full" : undefined}>
          <p
            className={cn(
              "font-semibold uppercase tracking-wide text-muted",
              embedded ? "text-[11px] tracking-[0.2em]" : "text-sm"
            )}
          >
            Medal class
          </p>
          <div
            className="mt-2 flex flex-col overflow-hidden rounded-xl border border-card-border sm:inline-flex sm:flex-row"
            role="group"
            aria-label="Medal class"
          >
            {classes.map((c, index) => {
              const active = c.id === activeClassId;
              const { term, detail, full } = medalClassPickerLines(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={full}
                  onClick={() => pick(c.id, null)}
                  className={cn(
                    "flex min-w-[9rem] max-w-full flex-col items-start px-4 py-3 text-left transition sm:min-w-[10.5rem]",
                    index > 0 && "border-t border-card-border sm:border-t-0 sm:border-l",
                    active
                      ? "bg-accent/15 text-accent"
                      : "bg-card/35 text-muted hover:bg-card/55 hover:text-foreground"
                  )}
                >
                  {term ? (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-90">
                      {term}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "font-bold leading-snug",
                      term ? "mt-1 text-sm sm:text-base" : "text-sm"
                    )}
                  >
                    {detail}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {subgroups.length > 0 ? (
          <label className={cn("block text-sm", embedded && "w-full")}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              Subgroup KPIs
            </span>
            <select
              value={subgroupSelectValue}
              onChange={(e) => pick(activeClassId, e.target.value || null)}
              className="mt-1.5 block w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2 text-sm font-medium"
            >
              <option value="">Athlete default (subgroup if assigned)</option>
              <option value="__whole__">Whole class KPIs</option>
              {subgroups.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}
