export type DraftGroupSelection = {
  coachId: string;
  classId: string;
  subgroupId: string;
};

export function reconcileDraftGroup(
  draft: DraftGroupSelection,
  options: {
    coaches: { id: string }[];
    classes: { id: string }[];
    subgroups: { id: string }[];
    allClassesValue?: string;
  }
): DraftGroupSelection {
  let coachId = draft.coachId;
  if (!options.coaches.some((c) => c.id === coachId)) {
    coachId = options.coaches[0]?.id ?? "";
  }

  let classId = draft.classId;
  const classAllowed =
    options.allClassesValue && classId === options.allClassesValue
      ? true
      : options.classes.some((c) => c.id === classId);
  if (!classAllowed) {
    classId = options.allClassesValue ?? options.classes[0]?.id ?? "";
  }

  let subgroupId = draft.subgroupId;
  if (subgroupId && !options.subgroups.some((s) => s.id === subgroupId)) {
    subgroupId = "";
  }

  return { coachId, classId, subgroupId };
}
