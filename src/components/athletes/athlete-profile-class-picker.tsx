"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { classSectionLabel } from "@/lib/periods";

export function AthleteProfileClassPicker({
  classes,
  selectedClassId,
  subgroupsByClassId = {},
  selectedSubgroupId = null,
  defaultSubgroupId = null,
}: {
  classes: { id: string; name: string; period: string | null }[];
  selectedClassId: string | null;
  /** Subgroups within each class — enables the subgroup KPI viewer. */
  subgroupsByClassId?: Record<string, { id: string; name: string }[]>;
  selectedSubgroupId?: string | null;
  /** Athlete's subgroup when URL has no subgroupId (matches student dashboard default). */
  defaultSubgroupId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

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
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  return (
    <div className={`mb-4 flex flex-wrap items-end gap-4 ${pending ? "opacity-70" : ""}`}>
      <label className="block text-sm">
        <span className="font-semibold uppercase tracking-wide text-muted">Medal class</span>
        <select
          value={selectedClassId ?? ""}
          onChange={(e) => pick(e.target.value, null)}
          className="mt-1 block w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2 font-medium"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {classSectionLabel(c)}
            </option>
          ))}
        </select>
      </label>
      {subgroups.length > 0 ? (
        <label className="block text-sm">
          <span className="font-semibold uppercase tracking-wide text-muted">Subgroup KPIs</span>
          <select
            value={subgroupSelectValue}
            onChange={(e) => pick(selectedClassId ?? "", e.target.value || null)}
            className="mt-1 block w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2 font-medium"
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
  );
}
