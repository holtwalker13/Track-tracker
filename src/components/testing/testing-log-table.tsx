"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useTransition } from "react";
import type { TestingLogSessionOption } from "@/lib/queries/testing-log";

function LogPickerInner({
  sessions,
  sessionId,
}: {
  sessions: TestingLogSessionOption[];
  sessionId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function pick(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("sessionId", id);
    else params.delete("sessionId");
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  return (
    <label className={`block text-sm ${pending ? "opacity-70" : ""}`}>
      Testing session
      <select
        value={sessionId}
        onChange={(e) => pick(e.target.value)}
        className="mt-1 w-full max-w-xl rounded-lg border border-card-border bg-background px-3 py-2"
      >
        {sessions.length === 0 ? (
          <option value="">No sessions for this class</option>
        ) : (
          sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

export function TestingLogSessionPicker(props: {
  sessions: TestingLogSessionOption[];
  sessionId: string;
}) {
  return (
    <Suspense fallback={null}>
      <LogPickerInner {...props} />
    </Suspense>
  );
}

export function TestingLogGrid({
  columns,
  rows,
}: {
  columns: { slug: string; name: string }[];
  rows: { athleteName: string; cells: Record<string, string | null> }[];
}) {
  if (columns.length === 0) {
    return (
      <p className="text-sm text-muted">This session has no test types yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-card-border bg-card/60 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-semibold">Athlete</th>
            {columns.map((c) => (
              <th key={c.slug} className="px-3 py-2 font-semibold whitespace-nowrap">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.athleteName} className="border-b border-card-border/60">
              <td className="px-3 py-2 font-medium whitespace-nowrap">{row.athleteName}</td>
              {columns.map((c) => (
                <td key={c.slug} className="px-3 py-2 font-mono tabular-nums text-muted">
                  {row.cells[c.slug] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TestingLogNavLink({ classId }: { classId?: string }) {
  const q = classId ? `?classId=${encodeURIComponent(classId)}` : "";
  return (
    <Link
      href={`/coach/testing/log${q}`}
      className="text-sm font-medium text-sky-300 hover:underline"
    >
      Testing log
    </Link>
  );
}
