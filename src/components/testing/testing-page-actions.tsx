"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { LiftingSessionActivityMeta } from "@/lib/lifting";
import { CoachModal } from "@/components/ui/coach-modal";
import { NewTestingSessionForm } from "@/components/testing/new-session-form";

export function TestingPageActions({
  classes,
  sameDayCount,
  strengthActivities,
}: {
  classes: { id: string; name: string; period: string | null }[];
  sameDayCount?: number;
  strengthActivities?: LiftingSessionActivityMeta[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
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
            sameDayCount={sameDayCount}
            strengthActivities={strengthActivities}
            surface="none"
          />
        </CoachModal>
      ) : null}
    </>
  );
}
