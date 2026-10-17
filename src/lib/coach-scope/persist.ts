import type { DraftGroupSelection } from "@/lib/coach-scope/reconcile";

/** Persist committed class/subgroup (and coach when permitted) for cross-view scope. */
export async function persistCoachGroupScope(
  selection: Pick<DraftGroupSelection, "coachId" | "classId" | "subgroupId"> & {
    classId: string;
  }
): Promise<boolean> {
  const classId =
    selection.classId === "all" || selection.classId === "" ? null : selection.classId;
  try {
    const res = await fetch("/api/coach/class-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachId: selection.coachId || null,
        classId,
        subgroupId: selection.subgroupId || null,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
