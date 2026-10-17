"use client";

import { Suspense, useCallback, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ScopeClassOption,
  ScopeCoachOption,
  ScopeSubgroupOption,
} from "@/components/coach/coach-class-scope-bar";
import { GroupContextButton } from "@/components/coach-scope/group-context-button";
import { GroupPickerSheet } from "@/components/compete/group-picker-sheet";
import {
  groupContextPrimaryLine,
  groupContextSecondaryLine,
} from "@/lib/coach-scope/labels";
import { persistCoachGroupScope } from "@/lib/coach-scope/persist";
import type { DraftGroupSelection } from "@/lib/coach-scope/reconcile";
import { useCoachScopeDirtyContext } from "@/components/coach-scope/coach-scope-dirty-context";

function CoachScopeControlsInner({
  coaches,
  classes,
  subgroups,
  coachId,
  classId,
  subgroupId,
  showCoach,
  showSubgroup,
  showSchoolSwitcher,
  schools,
  currentSchoolId,
  schoolName,
  allClassesLabel,
  applyLabel = "Apply group",
  trailing,
  className,
  autoOpenWhenEmpty,
}: {
  coaches: ScopeCoachOption[];
  classes: ScopeClassOption[];
  subgroups: ScopeSubgroupOption[];
  coachId: string;
  classId: string;
  subgroupId?: string;
  showCoach?: boolean;
  showSubgroup?: boolean;
  showSchoolSwitcher?: boolean;
  schools?: { id: string; name: string }[];
  currentSchoolId?: string;
  schoolName?: string | null;
  allClassesLabel?: string;
  applyLabel?: string;
  trailing?: ReactNode;
  className?: string;
  autoOpenWhenEmpty?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const dirtyCtx = useCoachScopeDirtyContext();
  const [open, setOpen] = useState(Boolean(autoOpenWhenEmpty && !classId));

  const committedSubgroup = subgroupId ?? "";

  const coach = coaches.find((c) => c.id === coachId);
  const primaryLine = groupContextPrimaryLine({
    classId,
    classes,
    allClassesLabel,
  });
  const secondaryLine = groupContextSecondaryLine({
    schoolName: schoolName ?? null,
    coach,
    subgroupId: committedSubgroup || null,
    subgroups,
    includeSubgroup: showSubgroup !== false && Boolean(classId) && classId !== "all",
  });

  const pushScope = useCallback(
    (draft: DraftGroupSelection) => {
      const params = new URLSearchParams(searchParams.toString());
      if (draft.coachId) params.set("coachId", draft.coachId);
      else params.delete("coachId");

      if (draft.classId === "all") params.set("classId", "all");
      else if (draft.classId) params.set("classId", draft.classId);
      else params.delete("classId");

      if (draft.subgroupId) params.set("subgroupId", draft.subgroupId);
      else params.delete("subgroupId");

      startTransition(() => {
        router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const commitSelection = useCallback(
    (draft: DraftGroupSelection) => {
      void persistCoachGroupScope(draft);
      pushScope(draft);
    },
    [pushScope]
  );

  const onApply = useCallback(
    (draft: DraftGroupSelection) => {
      setOpen(false);
      const run = () => commitSelection(draft);
      if (dirtyCtx) dirtyCtx.requestScopeChange(run);
      else run();
    },
    [commitSelection, dirtyCtx]
  );

  const sheetCommitted = useMemo(
    () => ({
      coachId,
      classId,
      subgroupId: committedSubgroup,
    }),
    [coachId, classId, committedSubgroup]
  );

  return (
    <div className={className}>
      <GroupContextButton
        primaryLine={primaryLine}
        secondaryLine={secondaryLine}
        onClick={() => setOpen(true)}
        disabled={pending}
      />
      {trailing ? <div className="mt-2 flex flex-wrap items-center gap-2">{trailing}</div> : null}
      <GroupPickerSheet
        open={open}
        onClose={() => setOpen(false)}
        committed={sheetCommitted}
        onApply={onApply}
        coaches={coaches}
        initialClasses={classes}
        initialSubgroups={subgroups}
        showCoach={showCoach ?? false}
        showSchoolSwitcher={showSchoolSwitcher ?? false}
        schools={schools ?? []}
        currentSchoolId={currentSchoolId}
        schoolName={schoolName ?? null}
        allClassesLabel={allClassesLabel}
        applyLabel={applyLabel}
      />
    </div>
  );
}

export function CoachScopeControls(
  props: React.ComponentProps<typeof CoachScopeControlsInner>
) {
  return (
    <Suspense fallback={<div className="mb-4 h-14 animate-pulse rounded-xl bg-[#1B2023]/60" />}>
      <CoachScopeControlsInner {...props} />
    </Suspense>
  );
}
