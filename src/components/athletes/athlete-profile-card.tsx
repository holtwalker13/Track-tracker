"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { PlayerAvatar } from "@/components/athletes/player-avatar";
import { AnonymousPeersToggle } from "@/components/athletes/anonymous-peers-toggle";
import { GRADE_LEVELS } from "@/lib/grades";

type EditProps = {
  studentId: string;
  firstName: string;
  lastName: string;
  sports: string | null;
  participationType: string | null;
  anonymousToPeers: boolean;
  classYear: number;
  classes: { id: string; name: string; period: string | null }[];
  enrolledClassIds: string[];
};

export function AthleteProfileCard({
  name,
  meta,
  seed,
  sports,
  classLabel,
  edit,
}: {
  name: string;
  meta: string;
  seed?: string;
  sports?: string | null;
  classLabel?: string | null;
  edit: EditProps;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
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
    const res = await fetch(`/api/students/${edit.studentId}`, {
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
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="mb-8 rounded-2xl border border-card-border bg-gradient-to-br from-card via-card to-sky-950/30 p-5 shadow-[0_0_40px_rgba(56,189,248,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <PlayerAvatar name={name} size="lg" seed={seed} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
            Athlete profile
          </p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
          <p className="mt-2 text-sm text-muted">{meta}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {classLabel && (
              <span className="rounded-full bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/40">
                {classLabel}
              </span>
            )}
            {sports ? (
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent ring-1 ring-accent/30">
                {sports}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                PE / general tracking
              </span>
            )}
            <AnonymousPeersToggle
              studentId={edit.studentId}
              anonymousToPeers={edit.anonymousToPeers}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((v) => !v);
            setError("");
            setMessage("");
          }}
          aria-expanded={editing}
          aria-label={editing ? "Close roster editor" : "Edit roster info"}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full border border-card-border text-muted transition hover:border-sky-400/50 hover:bg-sky-400/10 hover:text-sky-300"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {editing && (
        <form
          onSubmit={onSubmit}
          className="mt-5 border-t border-card-border pt-5"
        >
          <h2 className="text-lg font-semibold">Update roster info</h2>
          <p className="mt-1 text-sm text-muted">
            Coaches can set PE vs athlete tracking, peer anonymity, and class hour.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              First name
              <input
                name="firstName"
                defaultValue={edit.firstName}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Last name
              <input
                name="lastName"
                defaultValue={edit.lastName}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Graduating class
              <select
                name="classYear"
                defaultValue={edit.classYear}
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
                defaultValue={edit.participationType ?? ""}
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
                defaultChecked={edit.anonymousToPeers}
                className="mt-1"
              />
              <span>
                <span className="font-medium">Incognito for student views</span>
                <span className="mt-0.5 block text-muted">
                  Hide this athlete’s name from classmates and parents. Coaches still see full
                  identity.
                </span>
              </span>
            </label>
            <label className="text-sm sm:col-span-2">
              Sports (leave blank for PE-only)
              <input
                name="sports"
                defaultValue={edit.sports ?? ""}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Add / keep class hour
              <select
                name="classId"
                defaultValue={edit.enrolledClassIds[0] ?? ""}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              >
                <option value="">No change</option>
                {edit.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.period, c.name].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-card-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
