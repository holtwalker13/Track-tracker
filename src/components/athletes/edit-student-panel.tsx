"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GRADE_LEVELS } from "@/lib/grades";

export function EditStudentPanel({
  studentId,
  firstName,
  lastName,
  sports,
  participationType,
  anonymousToPeers,
  classYear,
  classes,
  enrolledClassIds,
}: {
  studentId: string;
  firstName: string;
  lastName: string;
  sports: string | null;
  participationType: string | null;
  anonymousToPeers: boolean;
  classYear: number;
  classes: { id: string; name: string; period: string | null }[];
  enrolledClassIds: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const classId = String(form.get("classId") || "");
    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        sports: form.get("sports"),
        participationType: form.get("participationType"),
        anonymousToPeers: form.get("anonymousToPeers") === "on",
        classYear: Number(form.get("classYear")),
        classId: classId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Update failed");
      return;
    }
    setMessage("Saved");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-card-border bg-card p-5">
      <h2 className="text-lg font-semibold">Update roster info</h2>
      <p className="mt-1 text-sm text-muted">Coaches can set PE vs athlete tracking, peer anonymity, and class hour.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          First name
          <input
            name="firstName"
            defaultValue={firstName}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Last name
          <input
            name="lastName"
            defaultValue={lastName}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Graduating class
          <select
            name="classYear"
            defaultValue={classYear}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            {GRADE_LEVELS.map((y) => (
              <option key={y} value={y}>
                Class of {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Tracking type
          <select
            name="participationType"
            defaultValue={participationType ?? ""}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            <option value="">Unset</option>
            <option value="PE">PE student</option>
            <option value="ATHLETE">Student athlete</option>
          </select>
        </label>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="anonymousToPeers"
            defaultChecked={anonymousToPeers}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Incognito for student views</span>
            <span className="mt-0.5 block text-muted">
              Hide this athlete’s name from classmates and parents. Coaches still see full identity.
            </span>
          </span>
        </label>
        <label className="text-sm sm:col-span-2">
          Sports (leave blank for PE-only)
          <input
            name="sports"
            defaultValue={sports ?? ""}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Add / keep class hour
          <select
            name="classId"
            defaultValue={enrolledClassIds[0] ?? ""}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            <option value="">No change</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.period, c.name].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
