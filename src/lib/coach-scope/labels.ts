import { classSectionLabel } from "@/lib/periods";
import type { ScopeClassOption, ScopeCoachOption } from "@/components/coach/coach-class-scope-bar";

export function groupContextPrimaryLine(input: {
  classId: string;
  classes: ScopeClassOption[];
  allClassesLabel?: string;
  emptyClassLabel?: string;
}): string {
  const { classId, classes, allClassesLabel, emptyClassLabel = "Choose a class" } = input;
  if (classId === "all") return allClassesLabel ?? "All classes";
  if (!classId) return emptyClassLabel;
  const row = classes.find((c) => c.id === classId);
  return row ? classSectionLabel(row) : emptyClassLabel;
}

export function groupContextSecondaryLine(input: {
  schoolName: string | null;
  coach: ScopeCoachOption | null | undefined;
  subgroupId: string | null | undefined;
  subgroups: { id: string; name: string }[];
  includeSubgroup?: boolean;
}): string {
  const parts: string[] = [];
  parts.push(input.schoolName?.trim() || "School");
  if (input.coach) {
    parts.push(`${input.coach.firstName} ${input.coach.lastName}`.trim());
  }
  if (input.includeSubgroup !== false) {
    const sg =
      input.subgroupId && input.subgroups.find((s) => s.id === input.subgroupId)
        ? input.subgroups.find((s) => s.id === input.subgroupId)!.name
        : "All students";
    parts.push(sg);
  }
  return parts.join(" · ");
}
