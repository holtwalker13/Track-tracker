"use client";

import { useCallback, useEffect, useState } from "react";
import { BottomSheet } from "@/components/compete/bottom-sheet";
import { SchoolSwitcher } from "@/components/admin/school-switcher";
import {
  reconcileDraftGroup,
  type DraftGroupSelection,
} from "@/lib/compete/query-state";
import { classSectionLabel } from "@/lib/periods";
import type { ScopeCoachOption, ScopeClassOption, ScopeSubgroupOption } from "@/components/coach/coach-class-scope-bar";

type ScopeOptions = {
  classes: ScopeClassOption[];
  subgroups: ScopeSubgroupOption[];
};

export function GroupPickerSheet({
  open,
  onClose,
  committed,
  onApply,
  coaches,
  initialClasses,
  initialSubgroups,
  showCoach,
  showSchoolSwitcher,
  schools,
  currentSchoolId,
  schoolName,
  allClassesLabel,
}: {
  open: boolean;
  onClose: () => void;
  committed: DraftGroupSelection;
  onApply: (next: DraftGroupSelection) => void;
  coaches: ScopeCoachOption[];
  initialClasses: ScopeClassOption[];
  initialSubgroups: ScopeSubgroupOption[];
  showCoach: boolean;
  showSchoolSwitcher: boolean;
  schools: { id: string; name: string }[];
  currentSchoolId?: string;
  schoolName: string | null;
  allClassesLabel?: string;
}) {
  const allClassesValue = allClassesLabel ? "all" : undefined;
  const [draft, setDraft] = useState<DraftGroupSelection>({
    coachId: committed.coachId,
    classId: committed.classId,
    subgroupId: committed.subgroupId,
  });
  const [options, setOptions] = useState<ScopeOptions>({
    classes: initialClasses,
    subgroups: initialSubgroups,
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft({
      coachId: committed.coachId,
      classId: committed.classId,
      subgroupId: committed.subgroupId,
    });
    setOptions({ classes: initialClasses, subgroups: initialSubgroups });
    setLoadError(null);
  }, [open, committed, initialClasses, initialSubgroups]);

  const fetchOptions = useCallback(
    async (coachId: string, classId: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams({ coachId });
        if (classId && classId !== allClassesValue) params.set("classId", classId);
        const res = await fetch(`/api/coach/scope-options?${params}`);
        if (!res.ok) throw new Error("Could not load classes");
        const data = (await res.json()) as ScopeOptions & { coachId: string };
        setOptions({ classes: data.classes, subgroups: data.subgroups });
        setDraft((prev) =>
          reconcileDraftGroup(
            { ...prev, coachId: data.coachId, classId, subgroupId: prev.subgroupId },
            {
              coaches,
              classes: data.classes,
              subgroups: data.subgroups,
              allClassesValue,
            }
          )
        );
      } catch {
        setLoadError("Could not load group options. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [allClassesValue, coaches]
  );

  useEffect(() => {
    if (!open || !showCoach) return;
    if (draft.coachId !== committed.coachId) {
      void fetchOptions(draft.coachId, draft.classId);
    }
  }, [draft.coachId, committed.coachId, fetchOptions, open, showCoach]);

  useEffect(() => {
    if (!open) return;
    if (draft.classId && draft.classId !== allClassesValue && draft.classId !== committed.classId) {
      void fetchOptions(draft.coachId, draft.classId);
    }
  }, [
    draft.classId,
    committed.classId,
    draft.coachId,
    fetchOptions,
    open,
    allClassesValue,
  ]);

  const draftCoach = coaches.find((c) => c.id === draft.coachId);
  const coachName = draftCoach ? `${draftCoach.firstName} ${draftCoach.lastName}` : "";

  const canApply =
    Boolean(draft.classId) &&
    !loading &&
    (draft.classId === allClassesValue ||
      options.classes.some((c) => c.id === draft.classId));

  return (
    <BottomSheet
      open={open}
      title="Choose group"
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!canApply}
          onClick={() => onApply(draft)}
          className="btn-primary w-full rounded-[10px] py-3 text-base font-bold disabled:opacity-50"
        >
          Show leaderboard
        </button>
      }
    >
      {loadError ? <p className="mb-3 text-sm text-danger">{loadError}</p> : null}

      {showSchoolSwitcher && schools.length > 1 ? (
        <div className="mb-4">
          <SchoolSwitcher
            schools={schools}
            currentSchoolId={currentSchoolId}
            layout="toolbar"
          />
        </div>
      ) : schoolName ? (
        <p className="mb-4 text-xs text-muted">School · {schoolName}</p>
      ) : null}

      {showCoach ? (
        coaches.length === 1 ? (
          <p className="mb-4 text-xs text-muted">Coach · {coachName?.trim()}</p>
        ) : (
          <label className="mb-4 block">
            <span className="text-xs text-muted">Coach</span>
            <select
              value={draft.coachId}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  coachId: e.target.value,
                  classId: allClassesValue ?? "",
                  subgroupId: "",
                }))
              }
              className="mt-1.5 w-full rounded-[10px] border border-[#30373B] bg-background px-3 py-3 text-base"
            >
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </label>
        )
      ) : coaches[0] ? (
        <p className="mb-4 text-xs text-muted">
          Coach · {coaches[0].firstName} {coaches[0].lastName}
        </p>
      ) : null}

      <label className="mb-4 block">
        <span className="text-xs text-muted">Class</span>
        <select
          value={draft.classId}
          disabled={options.classes.length === 0 || loading}
          onChange={(e) =>
            setDraft((d) => ({ ...d, classId: e.target.value, subgroupId: "" }))
          }
          className="mt-1.5 w-full rounded-[10px] border border-[#30373B] bg-background px-3 py-3 text-base disabled:opacity-50"
        >
          {options.classes.length === 0 ? (
            <option value="">No classes</option>
          ) : (
            <>
              {allClassesLabel ? (
                <option value={allClassesValue}>{allClassesLabel}</option>
              ) : null}
              {options.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {classSectionLabel(c)}
                </option>
              ))}
            </>
          )}
        </select>
      </label>

      {draft.classId && draft.classId !== allClassesValue ? (
        <label className="block">
          <span className="text-xs text-muted">Subgroup</span>
          <select
            value={draft.subgroupId}
            disabled={loading}
            onChange={(e) => setDraft((d) => ({ ...d, subgroupId: e.target.value }))}
            className="mt-1.5 w-full rounded-[10px] border border-[#30373B] bg-background px-3 py-3 text-base"
          >
            <option value="">All students</option>
            {options.subgroups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {options.classes.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No classes available for this coach.</p>
      ) : null}
    </BottomSheet>
  );
}
