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
    setMsg(
      `Created ${data.createdStudents} student(s), updated ${data.existingStudents}, ${data.classes} class(es), ${data.enrolled} enrollment(s).`
    );
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className={compact ? "space-y-3" : "space-y-3 rounded-2xl border border-card-border bg-card p-4"}
    >
      <h2 className="font-semibold">Upload roster spreadsheet</h2>
      <p className="text-sm text-muted">
        CSV from Excel or Google Sheets. Header row:{" "}
        <code className="text-xs">firstName,lastName,gender,classYear,studentNumber,className,period</code>
        . Missing students are created. Weightlifting classes are created from{" "}
        <code className="text-xs">className</code>.
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
