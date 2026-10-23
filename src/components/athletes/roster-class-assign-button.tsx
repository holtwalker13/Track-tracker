"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { CoachModal } from "@/components/ui/coach-modal";
import { classSectionLabel } from "@/lib/periods";

type ClassOption = { id: string; name: string; period: string | null };

export function RosterClassAssignButton({
  studentId,
  studentName,
  classes,
  currentClassName,
}: {
  studentId: string;
  studentName: string;
  classes: ClassOption[];
  currentClassName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [subgroupId, setSubgroupId] = useState("");
  const [subgroups, setSubgroups] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !classId) {
      setSubgroups([]);
      setSubgroupId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/classes/${classId}/subgroups`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { subgroups?: { id: string; name: string }[] };
      if (!cancelled) {
        setSubgroups(data.subgroups ?? []);
        setSubgroupId("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, classId]);

  async function save() {
    if (!classId) {
      setError("Pick a class");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        subgroupId: subgroupId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not assign class");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <span className="text-muted">{currentClassName ?? "—"}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-card-border text-muted hover:border-accent/40 hover:text-accent"
          aria-label={`Assign ${studentName} to a class`}
          title="Assign to class"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {open ? (
        <CoachModal title={`Assign ${studentName}`} onClose={() => setOpen(false)}>
          <div className="space-y-3 text-sm">
            <label className="block">
              Class
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {classSectionLabel(c)}
                  </option>
                ))}
              </select>
            </label>
            {subgroups.length > 0 ? (
              <label className="block">
                Subgroup
                <select
                  value={subgroupId}
                  onChange={(e) => setSubgroupId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
                >
                  <option value="">No subgroup</option>
                  {subgroups.map((sg) => (
                    <option key={sg.id} value={sg.id}>
                      {sg.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="w-full rounded-lg bg-accent py-2.5 font-semibold text-background disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </CoachModal>
      ) : null}
    </>
  );
}
