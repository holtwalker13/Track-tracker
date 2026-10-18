"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { CoachScopeControls } from "@/components/coach-scope/coach-scope-controls";
import type { ProgramsClassOption, ProgramsCoachOption } from "@/lib/queries/programs-hub";

function ProgramsScopeBarInner({
  coaches,
  classes,
  subgroups,
  coachId,
  classId,
  subgroupId,
  trailing,
  schoolName,
}: {
  coaches: ProgramsCoachOption[];
  classes: ProgramsClassOption[];
  subgroups: { id: string; name: string }[];
  coachId: string;
  classId: string;
  subgroupId: string;
  trailing?: ReactNode;
  schoolName?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const scopeTrailing = (
    <>
      {trailing}
      {classId ? (
        pathname.startsWith("/coach/programs/creator") ? (
          <Link
            href={qs ? `/coach/programs?${qs}` : "/coach/programs"}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-card-border bg-background text-muted hover:border-accent/40 hover:text-accent"
            aria-label="Back to programs calendar"
            title="Calendar"
          >
            <CalendarDays className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <Link
            href={qs ? `/coach/programs/creator?${qs}` : "/coach/programs/creator"}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-card-border bg-background text-muted hover:border-accent/40 hover:text-accent"
            aria-label="Program Creator"
            title="Program Creator"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </Link>
        )
      ) : null}
    </>
  );

  return (
    <CoachScopeControls
      coaches={coaches}
      classes={classes}
      subgroups={subgroups}
      coachId={coachId}
      classId={classId}
      subgroupId={subgroupId}
      showCoach={coaches.length > 1}
      showSubgroup
      schoolName={schoolName}
      applyLabel="Apply group"
      trailing={scopeTrailing}
      className="mb-1"
    />
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
  schoolName?: string | null;
}) {
  return (
    <Suspense fallback={<div className="h-14 animate-pulse rounded-xl bg-[#1B2023]/60" />}>
      <ProgramsScopeBarInner {...props} subgroupId={props.subgroupId ?? ""} />
    </Suspense>
  );
}
