"use client";

import { BottomSheet } from "@/components/compete/bottom-sheet";

export function ScopeChangeGuardSheet({
  open,
  onClose,
  onSaveAndSwitch,
  onDiscardAndSwitch,
  onKeepEditing,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSaveAndSwitch: () => void;
  onDiscardAndSwitch: () => void;
  onKeepEditing: () => void;
  saving?: boolean;
}) {
  return (
    <BottomSheet open={open} title="Unsaved changes" onClose={onClose}>
      <p className="mb-4 text-sm text-muted">
        You have unsaved edits for this group. Save them before switching, or discard and continue.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onSaveAndSwitch}
          className="btn-primary w-full rounded-[10px] py-3 text-base font-bold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save and switch group"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onDiscardAndSwitch}
          className="w-full rounded-[10px] border border-[#30373B] py-3 text-base font-medium"
        >
          Discard changes and switch
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onKeepEditing}
          className="w-full py-3 text-base font-medium text-muted"
        >
          Keep editing
        </button>
      </div>
    </BottomSheet>
  );
}
