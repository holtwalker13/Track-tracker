"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { ClassCoachInlineSelect } from "@/components/classes/class-coach-select";
import { classYearLabel } from "@/lib/grades";
import { cn } from "@/lib/utils";

type SubgroupRow = {
  id: string;
  name: string;
  members: { id: string; firstName: string; lastName: string }[];
};

export function SchoolClassExpandableRow({
  classId,
  name,
  period,
  programKind,
  gradeLevel,
  athleteCount,
  coachIds,
  coaches,
  canEdit,
  subgroups,
  roster,
}: {
  classId: string;
  name: string;
  period: string | null;
  programKind: string | null;
  gradeLevel: number | null;
  athleteCount: number;
  coachIds: string[];
  coaches: { id: string; firstName: string; lastName: string }[];
  canEdit: boolean;
  subgroups: SubgroupRow[];
  roster: { id: string; firstName: string; lastName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function deleteClass() {
    if (
      !confirm(
        `Delete class “${name}”? Athletes stay on the school roster but lose this class enrollment.`
      )
    ) {
      return;
    }
    setPending(true);
    const res = await fetch(`/api/classes/${classId}`, { method: "DELETE" });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <li className="rounded-xl border border-card-border bg-card">
      <div className="px-4 py-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 flex-1 flex-col gap-1 text-left hover:text-accent"
          >
            <span className="flex items-start gap-2 pr-1">
              <ChevronDown
                className={cn("mt-0.5 h-4 w-4 shrink-0 transition", open && "rotate-180")}
                aria-hidden
              />
              <span className="font-semibold leading-snug">{name}</span>
            </span>
            <span className="pl-6 text-sm leading-snug text-muted">
              {programKind === "TRAINING"
                ? "Training · "
                : programKind === "SCHOLASTIC"
                  ? "Class · "
                  : ""}
              {period ? `${period} · ` : ""}
              {gradeLevel ? classYearLabel(gradeLevel) : "mixed"}
              {" · "}
              {athleteCount} athletes
            </span>
          </button>
          {canEdit ? (
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={`/coach/school/classes/${classId}?edit=1`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-card-border text-muted hover:border-sky-400/40 hover:text-foreground"
                aria-label={`Rename ${name}`}
                title="Rename"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </a>
              <button
                type="button"
                disabled={pending}
                onClick={() => void deleteClass()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10"
                aria-label={`Delete ${name}`}
                title="Delete class"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
        <div className="mt-2 pl-6 sm:max-w-xs">
          <ClassCoachInlineSelect
            classId={classId}
            coachIds={coachIds}
            coaches={coaches}
            canEdit={canEdit}
          />
        </div>
      </div>
      {open ? (
        <div className="border-t border-card-border px-4 py-3 text-sm">
          {subgroups.length > 0 ? (
            <div className="mb-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Subgroups</p>
              {subgroups.map((sg) => (
                <details key={sg.id} className="rounded-lg border border-card-border/80 bg-background/40 px-3 py-2">
                  <summary className="cursor-pointer font-medium">
                    {sg.name}{" "}
                    <span className="text-muted">({sg.members.length})</span>
                  </summary>
                  <ul className="mt-2 space-y-1 text-muted">
                    {sg.members.map((m) => (
                      <li key={m.id}>
                        {m.firstName} {m.lastName}
                      </li>
                    ))}
                    {sg.members.length === 0 ? <li>No athletes in this subgroup</li> : null}
                  </ul>
                </details>
              ))}
            </div>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Roster</p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-muted">
            {roster.map((s) => (
              <li key={s.id}>
                <a href={`/coach/students/${s.id}`} className="hover:text-accent">
                  {s.firstName} {s.lastName}
                </a>
              </li>
            ))}
            {roster.length === 0 ? <li>No athletes enrolled</li> : null}
          </ul>
          <a
            href={`/coach/school/classes/${classId}`}
            className="mt-3 inline-block text-sm font-medium text-sky-300 hover:underline"
          >
            Manage class →
          </a>
        </div>
      ) : null}
    </li>
  );
}
