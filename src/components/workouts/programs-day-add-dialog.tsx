"use client";

import Link from "next/link";
import { ClipboardList, Dumbbell, UserCheck } from "lucide-react";
import { CoachModal } from "@/components/ui/coach-modal";
import { NewTestingSessionForm } from "@/components/testing/new-session-form";
import { ClassAttendancePanel } from "@/components/workouts/class-attendance-panel";
import {
  ScheduleWorkoutDialog,
  type ScheduleTemplate,
} from "@/components/workouts/schedule-workout-dialog";
import { format, parseISO } from "date-fns";

export type DayAddKind = "choose" | "workout" | "test" | "attendance";

export type TestBuilderProps = {
  classes: { id: string; name: string; period: string | null }[];
  kpiLibrary: { slug: string; name: string; categorySlug?: string }[];
  metricsByClassId: Record<string, { ranked: string[]; unranked: string[] }>;
};

export function ProgramsDayAddDialog({
  date,
  kind,
  classId,
  classLabel,
  subgroupId,
  subgroupName,
  templates,
  testBuilder,
  creatorHref,
  onPick,
  onClose,
}: {
  date: string;
  kind: DayAddKind;
  classId: string;
  classLabel: string;
  subgroupId?: string | null;
  subgroupName?: string | null;
  templates: ScheduleTemplate[];
  testBuilder?: TestBuilderProps;
  creatorHref: string;
  onPick: (kind: Exclude<DayAddKind, "choose">) => void;
  onClose: () => void;
}) {
  const dayLabel = format(parseISO(date), "EEE, MMM d");
  const scopeLabel = subgroupName ? `${classLabel} · ${subgroupName}` : classLabel;

  if (kind === "workout") {
    if (templates.length === 0) {
      return (
        <CoachModal eyebrow={dayLabel} title="Add workout" onClose={onClose} maxWidth="max-w-md">
          <p className="text-sm text-muted">
            No saved workouts for this class yet. Build one in Program Creator, then schedule it here.
          </p>
          <Link
            href={creatorHref}
            className="mt-3 inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background"
          >
            Open Program Creator
          </Link>
        </CoachModal>
      );
    }
    return (
      <ScheduleWorkoutDialog
        templates={templates}
        classId={classId}
        scopeLabel={scopeLabel}
        subgroupId={subgroupId}
        initialDate={date}
        onClose={onClose}
      />
    );
  }

  if (kind === "test") {
    return (
      <CoachModal eyebrow={dayLabel} title="New live testing session" onClose={onClose} maxWidth="max-w-2xl">
        {testBuilder ? (
          <NewTestingSessionForm
            classes={testBuilder.classes}
            defaultClassId={classId}
            kpiLibrary={testBuilder.kpiLibrary}
            metricsByClassId={testBuilder.metricsByClassId}
            defaultDate={date}
            surface="none"
          />
        ) : (
          <p className="text-sm text-muted">Testing is not available for this class yet.</p>
        )}
      </CoachModal>
    );
  }

  if (kind === "attendance") {
    return (
      <CoachModal eyebrow={dayLabel} title="Attendance" onClose={onClose} maxWidth="max-w-md">
        <p className="mb-3 text-xs text-muted">
          Tap names as they walk in. Saves as you go for {scopeLabel}.
        </p>
        <ClassAttendancePanel classId={classId} date={date} subgroupId={subgroupId} />
      </CoachModal>
    );
  }

  const options = [
    {
      id: "workout" as const,
      label: "Workout",
      detail: "Schedule a saved workout",
      icon: Dumbbell,
    },
    {
      id: "test" as const,
      label: "Test",
      detail: "Start or schedule a live test",
      icon: ClipboardList,
    },
    {
      id: "attendance" as const,
      label: "Attendance",
      detail: "Mark who’s here today",
      icon: UserCheck,
    },
  ];

  return (
    <CoachModal eyebrow={dayLabel} title="Add to this day" onClose={onClose} maxWidth="max-w-md">
      <div className="grid gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onPick(option.id)}
              className="flex items-center gap-3 rounded-2xl border border-card-border bg-background/40 px-4 py-3 text-left transition hover:border-accent/40 hover:bg-accent/5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-xs text-muted">{option.detail}</span>
              </span>
            </button>
          );
        })}
      </div>
    </CoachModal>
  );
}
