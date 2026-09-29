"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { classSectionLabel } from "@/lib/periods";
import type { ProgramsClassOption, ProgramsCoachOption } from "@/lib/queries/programs-hub";

export function ProgramsScopeBar({
  coaches,
  classes,
  coachId,
  classId,
}: {
  coaches: ProgramsCoachOption[];
  classes: ProgramsClassOption[];
  coachId: string;
  classId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(next: { coachId?: string; classId?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.coachId != null) {
      params.set("coachId", next.coachId);
      params.delete("classId");
    }
    if (next.classId != null) {
      if (next.classId) params.set("classId", next.classId);
      else params.delete("classId");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded-2xl border border-card-border bg-card/50 p-3 sm:p-4 ${
        pending ? "opacity-70" : ""
      }`}
    >
      <label className="block min-w-[12rem] flex-1 text-sm">
        Coach
        <select
          value={coachId}
          onChange={(e) => update({ coachId: e.target.value })}
          className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
        >
          {coaches.length === 0 ? (
            <option value="">No coaches</option>
          ) : (
            coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))
          )}
        </select>
      </label>
      <label className="block min-w-[12rem] flex-1 text-sm">
        Class
        <select
          value={classId}
          onChange={(e) => update({ classId: e.target.value })}
          disabled={classes.length === 0}
          className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 disabled:opacity-50"
        >
          {classes.length === 0 ? (
            <option value="">No classes for this coach</option>
          ) : (
            classes.map((c) => (
              <option key={c.id} value={c.id}>
                {classSectionLabel(c)}
              </option>
            ))
          )}
        </select>
      </label>
    </div>
  );
}
