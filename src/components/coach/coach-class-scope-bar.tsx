"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { CreateClassForm } from "@/components/classes/class-forms";
import { CoachModal } from "@/components/ui/coach-modal";
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
  allClassesLabel,
}: {
  coaches: ScopeCoachOption[];
  classes: ScopeClassOption[];
  subgroups: ScopeSubgroupOption[];
  coachId: string;
  classId: string;
  subgroupId: string;
  showCoach: boolean;
  showSubgroup: boolean;
  allClassesLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const coachOptions = coaches.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
  }));

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
      {classes.length === 0 ? (
        <div className="min-w-[10rem] flex-1 text-sm">
          <span className="block">Class</span>
          <div className="mt-1 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-card-border bg-background/60 px-3 py-2">
            <p className="min-w-0 flex-1 text-sm text-muted">No classes for this coach yet.</p>
            {coachOptions.length > 0 ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sport-green px-3 py-1.5 text-sm font-semibold text-background hover:brightness-110"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                Create class
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <label className="block min-w-[10rem] flex-1 text-sm">
          Class
          <select
            value={classId}
            onChange={(e) => push({ classId: e.target.value || null, subgroupId: null })}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            {allClassesLabel ? <option value="all">{allClassesLabel}</option> : null}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {classSectionLabel(c)}
              </option>
            ))}
          </select>
        </label>
      )}
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
      {createOpen ? (
        <CoachModal title="Create a class" onClose={() => setCreateOpen(false)}>
          <CreateClassForm
            surface="none"
            coaches={coachOptions}
            defaultCoachId={coachId || coachOptions[0]?.id || ""}
            onSuccess={(newClassId) => {
              setCreateOpen(false);
              push({
                classId: newClassId,
                coachId: coachId || null,
                subgroupId: null,
              });
            }}
          />
        </CoachModal>
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
  /** When set, the class menu can choose school-wide events (`classId=all`). */
  allClassesLabel?: string;
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
