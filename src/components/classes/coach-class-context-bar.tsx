"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { classSectionLabel } from "@/lib/periods";
import type { CoachClassOption } from "@/lib/coach-class-context";
import { cn } from "@/lib/utils";

export function CoachClassContextBar({
  classes,
  subgroups,
  classId,
  subgroupId,
  compact = false,
  layout = "inline",
}: {
  classes: CoachClassOption[];
  subgroups: { id: string; name: string; memberIds: string[] }[];
  classId: string | null;
  subgroupId: string | null;
  compact?: boolean;
  layout?: "inline" | "toolbar";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (classes.length === 0) return null;

  const toolbar = layout === "toolbar";
  const selectClass = cn(
    "min-w-0 rounded-lg border border-card-border bg-background font-medium",
    toolbar ? "flex-1 py-2" : "max-w-[11rem] truncate sm:max-w-[14rem]",
    compact ? "px-2 py-1" : "px-2.5 py-1.5"
  );

  async function persist(next: { classId?: string | null; subgroupId?: string | null }) {
    const res = await fetch("/api/coach/class-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: next.classId !== undefined ? next.classId : classId,
        subgroupId: next.subgroupId !== undefined ? next.subgroupId : subgroupId,
      }),
    });
    if (!res.ok) return;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2",
        toolbar && "w-full gap-3 sm:w-auto sm:min-w-[14rem] sm:flex-1 sm:max-w-md",
        pending && "opacity-70",
        compact ? "text-xs" : "text-sm"
      )}
    >
      <label
        className={cn(
          "flex min-w-0 items-center gap-2",
          toolbar && "w-full sm:w-auto"
        )}
      >
        <span className="w-12 shrink-0 font-semibold uppercase tracking-wide text-muted">
          Class
        </span>
        <select
          value={classId ?? ""}
          onChange={(e) => {
            const id = e.target.value || null;
            void persist({ classId: id, subgroupId: null });
          }}
          className={selectClass}
          aria-label="Current class"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {classSectionLabel(c)}
            </option>
          ))}
        </select>
      </label>
      {classId && subgroups.length > 0 ? (
        <label className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 font-semibold uppercase tracking-wide text-muted">Group</span>
          <select
            value={subgroupId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              void persist({ subgroupId: id });
            }}
            className={cn(
              selectClass,
              !toolbar && "max-w-[10rem] truncate sm:max-w-[12rem]"
            )}
            aria-label="Subgroup filter"
          >
            <option value="">All athletes</option>
            {subgroups.map((sg) => (
              <option key={sg.id} value={sg.id}>
                {sg.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
