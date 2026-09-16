"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Student = { id: string; name: string };
type Activity = { id: string; name: string; slug: string };

export default function StudentStationPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/testing/session-meta?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.students ?? []);
        setActivities(d.activities ?? []);
      });
  }, [sessionId]);

  const student = students[idx];

  async function saveAndNext() {
    if (!student) return;
    setSaving(true);
    for (const act of activities) {
      const val = scores[act.id];
      if (!val) continue;
      await fetch("/api/testing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          activityId: act.id,
          testingSessionId: sessionId,
          attempts: [Number(val)],
        }),
      });
    }
    setScores({});
    setIdx((i) => Math.min(i + 1, students.length - 1));
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href={`/coach/testing/${sessionId}`} className="text-sm text-accent">
        ← Back to live grid
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Student station</h1>
      {student ? (
        <>
          <p className="mt-2 text-lg">{student.name}</p>
          <p className="text-sm text-muted">
            Student {idx + 1} of {students.length}
          </p>
          <div className="mt-6 space-y-4">
            {activities.map((act) => (
              <label key={act.id} className="block">
                <span className="text-sm text-muted">{act.name}</span>
                <input
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-card-border bg-card px-3 py-4 text-2xl font-bold"
                  value={scores[act.id] ?? ""}
                  onChange={(e) =>
                    setScores((s) => ({ ...s, [act.id]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={saveAndNext}
            disabled={saving}
            className="mt-6 w-full rounded-lg bg-accent py-4 text-lg font-semibold text-background"
          >
            {saving ? "Saving…" : "Save student → Next"}
          </button>
        </>
      ) : (
        <p className="mt-4 text-muted">Loading…</p>
      )}
    </div>
  );
}
