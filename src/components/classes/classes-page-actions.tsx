"use client";

import { Upload, Plus } from "lucide-react";
import { useState } from "react";
import { CoachModal } from "@/components/ui/coach-modal";
import { CreateClassForm, CreateWeightsPeriodsButton } from "@/components/classes/class-forms";
import { ImportRosterForm } from "@/components/roster/import-roster-form";

export function ClassesPageActions() {
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-sport-green px-4 py-2.5 text-sm font-semibold text-background shadow-[0_0_20px_rgba(74,222,128,0.25)] hover:brightness-110"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          Create class
        </button>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-semibold hover:border-foreground/30"
        >
          <Upload className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          Upload class
        </button>
      </div>
      {createOpen ? (
        <CoachModal title="Create a class" onClose={() => setCreateOpen(false)}>
          <CreateClassForm surface="none" />
          <div className="mt-6 border-t border-card-border pt-4">
            <CreateWeightsPeriodsButton surface="none" />
          </div>
        </CoachModal>
      ) : null}
      {uploadOpen ? (
        <CoachModal title="Upload roster spreadsheet" onClose={() => setUploadOpen(false)} maxWidth="max-w-xl">
          <ImportRosterForm compact />
        </CoachModal>
      ) : null}
    </>
  );
}
