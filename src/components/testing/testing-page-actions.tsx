"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { CoachModal } from "@/components/ui/coach-modal";
import { NewTestingSessionForm } from "@/components/testing/new-session-form";
import { CoachClassScopeBar } from "@/components/coach/coach-class-scope-bar";
import type {
  ScopeClassOption,
  ScopeCoachOption,
} from "@/components/coach/coach-class-scope-bar";

export function TestingPageActions({
  coaches,
  classes,
  coachId,
  classId,
  showCoachPicker,
  defaultClassId,
  sameDayCount,
  kpiLibrary,
  metricsByClassId,
}: {
  coaches: ScopeCoachOption[];
  classes: ScopeClassOption[];
  coachId: string;
  classId: string;
  showCoachPicker?: boolean;
  defaultClassId?: string;
  sameDayCount?: number;
  /** Full school KPI library (testing metrics + workout lifts + customs). */
  kpiLibrary?: { slug: string; name: string }[];
  /** Per-class KPI set ordering: ranked slugs first, then unranked set members. */
  metricsByClassId?: Record<string, { ranked: string[]; unranked: string[] }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <CoachClassScopeBar
        coaches={coaches}
        classes={classes}
        subgroups={[]}
        coachId={coachId}
        classId={classId}
        showCoach={showCoachPicker}
        showSubgroup={false}
      />
      <div className="mb-4 mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-sport-green px-4 py-2.5 text-sm font-semibold text-background shadow-[0_0_20px_rgba(74,222,128,0.25)] hover:brightness-110"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          Create test
        </button>
      </div>
      {open ? (
        <CoachModal title="New live testing session" onClose={() => setOpen(false)} maxWidth="max-w-2xl">
          <NewTestingSessionForm
            classes={classes}
            defaultClassId={defaultClassId ?? classId}
            sameDayCount={sameDayCount}
            kpiLibrary={kpiLibrary}
            metricsByClassId={metricsByClassId}
            surface="none"
          />
        </CoachModal>
      ) : null}
    </>
  );
}
