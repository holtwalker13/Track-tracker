"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useTransition } from "react";
import { classSectionLabel } from "@/lib/periods";

export type ScopeCoachOption = { id: string; firstName: string; lastName: string };
export type ScopeClassOption = { id: string; name: string; period: string | null };
export type ScopeSubgroupOption = { id: string; name: string };

function ScopeBarInner({
  coaches,
  classes,
  subgroups,
  coachId,
  classId,
  subgroupId,
  showCoach,
  showSubgroup,
}: {
  coaches: ScopeCoachOption[];
  classes: ScopeClassOption[];
  subgroups: ScopeSubgroupOption[];
  coachId: string;
  classId: string;
  subgroupId: string;
  showCoach: boolean;
  showSubgroup: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function push(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded-2xl border border-card-border bg-card/50 p-3 sm:p-4 ${
        pending ? "opacity-70" : ""
      }`}
    >
      {showCoach ? (
        <label className="block min-w-[10rem] flex-1 text-sm">
          Coach
          <select
            value={coachId}
            onChange={(e) =>
              push({ coachId: e.target.value, classId: null, subgroupId: null })
            }
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block min-w-[10rem] flex-1 text-sm">
        Class
        <select
          value={classId}
          onChange={(e) => push({ classId: e.target.value || null, subgroupId: null })}
          disabled={classes.length === 0}
          className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 disabled:opacity-50"
        >
          {classes.length === 0 ? (
            <option value="">No classes</option>
          ) : (
            classes.map((c) => (
              <option key={c.id} value={c.id}>
                {classSectionLabel(c)}
              </option>
            ))
          )}
        </select>
      </label>
      {showSubgroup && classId ? (
        <label className="block min-w-[10rem] flex-1 text-sm">
          Subgroup
          <select
            value={subgroupId}
            onChange={(e) => push({ subgroupId: e.target.value || null })}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            <option value="">All students</option>
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

export function CoachClassScopeBar(props: {
  coaches: ScopeCoachOption[];
  classes: ScopeClassOption[];
  subgroups: ScopeSubgroupOption[];
  coachId: string;
  classId: string;
  subgroupId?: string;
  showCoach?: boolean;
  showSubgroup?: boolean;
}) {
  return (
    <Suspense fallback={<div className="mb-4 h-16 animate-pulse rounded-2xl bg-card/40" />}>
      <ScopeBarInner
        {...props}
        subgroupId={props.subgroupId ?? ""}
        showCoach={props.showCoach ?? false}
        showSubgroup={props.showSubgroup ?? false}
      />
    </Suspense>
  );
}
