"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportRosterForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/roster/import", { method: "POST", body: fd });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Import failed");
      return;
    }
    const skipped = Number(data.skippedEmails ?? 0);
    setMsg(
      `Created ${data.createdStudents} student(s), updated ${data.existingStudents}, added email on ${data.emailsAdded ?? 0}.${
        skipped > 0 ? ` Skipped ${skipped} email(s) that are not an allowed school address.` : ""
      }`
    );
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className={compact ? "space-y-3" : "space-y-3 rounded-2xl border border-card-border bg-card p-4"}
    >
      {!compact ? <h2 className="font-semibold">Upload roster spreadsheet</h2> : null}
      <p className="text-sm text-muted">
        CSV from Excel or Google Sheets. Header row:{" "}
        <code className="text-xs">
          firstName,lastName,email,gender,classYear,studentNumber,className,period
        </code>
        . An <code className="text-xs">email</code> column fills the roster email. Rows that match an
        existing student by ID, username, or first and last name keep that student and add the email.
        New names are added. Jackson students need <code className="text-xs">@jacksonindians.us</code>.
      </p>
      <a
        href="/templates/roster-import.csv"
        className="inline-block text-sm text-accent hover:underline"
        download
      >
        Download template CSV
      </a>
      <input required name="file" type="file" accept=".csv,text/csv,text/plain" className="block text-sm" />
      {error && <p className="text-sm text-sport-red">{error}</p>}
      {msg && <p className="text-sm text-success">{msg}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? "Importing…" : "Import spreadsheet"}
      </button>
    </form>
  );
}
