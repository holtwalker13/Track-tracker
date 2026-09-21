"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportMarksForm() {
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
    const res = await fetch("/api/marks/import", { method: "POST", body: fd });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Import failed");
      return;
    }
    const bits = [`Imported ${data.imported} mark(s)`];
    if (data.skippedMissingStudent) bits.push(`${data.skippedMissingStudent} unknown ID(s)`);
    if (data.skippedBadDate) bits.push(`${data.skippedBadDate} bad date(s)`);
    if (data.unknown?.length) bits.push(`skipped columns: ${data.unknown.join(", ")}`);
    setMsg(bits.join(" · "));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="font-semibold">Import past KPI marks</h2>
      <p className="text-sm text-muted">
        Build your events in KPI targets first, download that template, fill it in Excel or Google
        Sheets, then upload. Headers must match your event names exactly so Front squat cannot land
        on Front full squat.
      </p>
      <p className="text-xs text-muted">
        Required columns: <code>studentNumber</code>, <code>testingDate</code> (YYYY-MM-DD). Other
        columns are your KPI names. Values use the same units as the builder (seconds, inches, lb).
      </p>
      <a href="/api/marks/template" className="inline-block text-sm text-accent hover:underline">
        Download template from this school&apos;s KPIs
      </a>
      <input required name="file" type="file" accept=".csv,text/csv,text/plain" className="block text-sm" />
      {error && <p className="text-sm text-sport-red">{error}</p>}
      {msg && <p className="text-sm text-success">{msg}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? "Importing…" : "Upload marks CSV"}
      </button>
    </form>
  );
}
