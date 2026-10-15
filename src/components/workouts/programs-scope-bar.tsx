"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useTransition, type ReactNode } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { classSectionLabel } from "@/lib/periods";
import type { ProgramsClassOption, ProgramsCoachOption } from "@/lib/queries/programs-hub";

function ProgramsScopeBarInner({
  coaches,
  classes,
  subgroups,
  coachId,
  classId,
  subgroupId,
  trailing,
}: {
  coaches: ProgramsCoachOption[];
  classes: ProgramsClassOption[];
  subgroups: { id: string; name: string }[];
  coachId: string;
  classId: string;
  subgroupId: string;
  trailing?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const qs = searchParams.toString();

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
      <label className="block min-w-[12rem] flex-1 text-sm">
        Coach
        <select
          value={coachId}
          onChange={(e) =>
            push({ coachId: e.target.value, classId: null, subgroupId: null })
          }
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
          onChange={(e) => push({ classId: e.target.value || null, subgroupId: null })}
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
      {classId ? (
        <label className="block min-w-[12rem] flex-1 text-sm">
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
      {classId ? (
        <div className="flex items-center gap-2">
          {trailing}
          {pathname.startsWith("/coach/programs/creator") ? (
            <Link
              href={qs ? `/coach/programs?${qs}` : "/coach/programs"}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-card-border bg-background text-muted hover:border-accent/40 hover:text-accent"
              aria-label="Back to programs calendar"
              title="Calendar"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <Link
              href={qs ? `/coach/programs/creator?${qs}` : "/coach/programs/creator"}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-card-border bg-background text-muted hover:border-accent/40 hover:text-accent"
              aria-label="Program Creator"
              title="Program Creator"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ProgramsScopeBar(props: {
  coaches: ProgramsCoachOption[];
  classes: ProgramsClassOption[];
  subgroups: { id: string; name: string }[];
  coachId: string;
  classId: string;
  subgroupId?: string;
  trailing?: ReactNode;
}) {
  return (
    <Suspense fallback={<div className="h-16 animate-pulse rounded-2xl bg-card/40" />}>
      <ProgramsScopeBarInner {...props} subgroupId={props.subgroupId ?? ""} />
    </Suspense>
  );
}
