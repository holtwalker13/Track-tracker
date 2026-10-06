"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { classSectionLabel } from "@/lib/periods";

export function AthleteProfileClassPicker({
  classes,
  selectedClassId,
  subgroupsByClassId = {},
  selectedSubgroupId = null,
}: {
  classes: { id: string; name: string; period: string | null }[];
  selectedClassId: string | null;
  /** Subgroups within each class — enables the subgroup KPI viewer. */
  subgroupsByClassId?: Record<string, { id: string; name: string }[]>;
  selectedSubgroupId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  if (classes.length === 0) return null;

  const subgroups = (selectedClassId && subgroupsByClassId[selectedClassId]) || [];

  function pick(classId: string, subgroupId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (classId) params.set("classId", classId);
    else params.delete("classId");
    if (subgroupId) params.set("subgroupId", subgroupId);
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
            value={selectedSubgroupId ?? ""}
            onChange={(e) => pick(selectedClassId ?? "", e.target.value || null)}
            className="mt-1 block w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2 font-medium"
          >
            <option value="">Whole class</option>
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
