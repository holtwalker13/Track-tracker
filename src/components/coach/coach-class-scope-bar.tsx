"use client";

import type { ReactNode } from "react";

export type ScopeCoachOption = { id: string; firstName: string; lastName: string };
export type ScopeClassOption = { id: string; name: string; period: string | null };
export type ScopeSubgroupOption = { id: string; name: string };

import { CoachScopeControls } from "@/components/coach-scope/coach-scope-controls";

/** @deprecated Use CoachScopeControls directly. Kept for import compatibility. */
export function CoachClassScopeBar(props: {
  coaches: ScopeCoachOption[];
  classes: ScopeClassOption[];
  subgroups: ScopeSubgroupOption[];
  coachId: string;
  classId: string;
  subgroupId?: string;
  showCoach?: boolean;
  showSubgroup?: boolean;
  allClassesLabel?: string;
  schoolName?: string | null;
  applyLabel?: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <CoachScopeControls
      {...props}
      subgroupId={props.subgroupId ?? ""}
      showCoach={props.showCoach ?? false}
      showSubgroup={props.showSubgroup ?? false}
      className={props.className ?? "mb-4"}
    />
  );
}
