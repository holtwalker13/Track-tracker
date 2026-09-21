"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { ROSTER_COLUMNS, type RosterAthlete } from "@/lib/queries/roster";
import { classYearShort } from "@/lib/grades";
import { cn } from "@/lib/utils";

type SortKey =
  | "name"
  | "studentNumber"
  | "classYear"
  | "classPeriod"
  | "sports"
  | "participationType"
  | "nameHidden"
  | (typeof ROSTER_COLUMNS)[number]["slug"];

function participationLabel(value: string | null) {
  if (value === "ATHLETE") return "Athlete";
  if (value === "PE") return "PE";
  return "—";
}

export function RosterTable({
  athletes,
  showClass,
}: {
  athletes: RosterAthlete[];
  showClass: boolean;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hiddenById, setHiddenById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(athletes.map((a) => [a.studentId, a.nameHidden]))
  );
  const [pending, setPending] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" || key === "studentNumber" ? "asc" : "desc");
  }

  const sorted = useMemo(() => {
    const copy = [...athletes];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === "nameHidden") {
        const av = hiddenById[a.studentId] ? 1 : 0;
        const bv = hiddenById[b.studentId] ? 1 : 0;
        return (av - bv) * dir;
      }
      const markSlug = ROSTER_COLUMNS.find((c) => c.slug === sortKey)?.slug;
      if (markSlug) {
        const av = a.marks[markSlug]?.value;
        const bv = b.marks[markSlug]?.value;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av - bv) * dir;
      }
      const astr =
        sortKey === "name"
          ? a.fullName
          : sortKey === "studentNumber"
            ? a.studentNumber
            : sortKey === "classYear"
              ? String(a.classYear ?? "")
              : sortKey === "classPeriod"
                ? `${a.classPeriod ?? ""} ${a.className ?? ""}`
                : sortKey === "sports"
                  ? a.sports ?? ""
                  : sortKey === "participationType"
                    ? a.participationType ?? ""
                    : "";
      const bstr =
        sortKey === "name"
          ? b.fullName
          : sortKey === "studentNumber"
            ? b.studentNumber
            : sortKey === "classYear"
              ? String(b.classYear ?? "")
              : sortKey === "classPeriod"
                ? `${b.classPeriod ?? ""} ${b.className ?? ""}`
                : sortKey === "sports"
                  ? b.sports ?? ""
                  : sortKey === "participationType"
                    ? b.participationType ?? ""
                    : "";
      return astr.localeCompare(bstr, undefined, { numeric: true, sensitivity: "base" }) * dir;
    });
    return copy;
  }, [athletes, sortDir, sortKey, hiddenById]);

  async function setHidden(ids: string[], nameHidden: boolean) {
    if (ids.length === 0) return;
    setPending(true);
    setHiddenById((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = nameHidden;
      return next;
    });
    await fetch("/api/students/visibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: ids, nameHidden }),
    });
    setPending(false);
    router.refresh();
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = athletes.length > 0 && selected.size === athletes.length;

  if (athletes.length === 0) {
    return <p className="text-sm text-muted">No athletes in this filter.</p>;
  }

  function Header({
    label,
    sortId,
    align = "left",
  }: {
    label: string;
    sortId: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === sortId;
    return (
      <th className={cn("px-3 py-2.5 font-semibold", align === "right" && "text-right")}>
        <button
          type="button"
          onClick={() => toggleSort(sortId)}
          className={cn(
            "inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-sky-300",
            active ? "text-sky-300" : "text-muted"
          )}
        >
          {label}
          <span className="text-[10px] opacity-80" aria-hidden>
            {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-card-border bg-card px-3 py-2">
          <p className="text-sm text-muted">{selected.size} selected</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => setHidden([...selected], true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs font-semibold hover:bg-background"
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
            Hide names
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setHidden([...selected], false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs font-semibold hover:bg-background"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Show names
          </button>
        </div>
      )}
      <table className="min-w-full text-left text-sm">
        <thead className="bg-card text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelected(allSelected ? new Set() : new Set(athletes.map((a) => a.studentId)))
                }
                aria-label="Select all athletes"
              />
            </th>
            <th className="sticky left-0 z-10 bg-card px-3 py-2.5 font-semibold">
              <button
                type="button"
                onClick={() => toggleSort("name")}
                className={cn(
                  "inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-sky-300",
                  sortKey === "name" ? "text-sky-300" : "text-muted"
                )}
              >
                Name
                <span className="text-[10px] opacity-80" aria-hidden>
                  {sortKey === "name" ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </button>
            </th>
            <Header label="Visible" sortId="nameHidden" />
            <Header label="ID" sortId="studentNumber" />
            {showClass && <Header label="Year" sortId="classYear" />}
            <Header label="Hour / Class" sortId="classPeriod" />
            <Header label="Type" sortId="participationType" />
            <Header label="Sports" sortId="sports" />
            {ROSTER_COLUMNS.map((col) => (
              <Header key={col.slug} label={col.label} sortId={col.slug} align="right" />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => {
            const hidden = hiddenById[a.studentId] ?? a.nameHidden;
            return (
              <tr key={a.studentId} className="border-t border-card-border/70 hover:bg-white/[0.03]">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(a.studentId)}
                    onChange={() => toggleSelected(a.studentId)}
                    aria-label={`Select ${a.fullName}`}
                  />
                </td>
                <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium whitespace-nowrap">
                  <Link href={`/coach/students/${a.studentId}`} className="hover:text-accent">
                    {a.fullName}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setHidden([a.studentId], !hidden)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full border transition",
                      hidden
                        ? "border-card-border text-muted hover:text-foreground"
                        : "border-sky-400/40 bg-sky-500/15 text-sky-300"
                    )}
                    aria-label={
                      hidden
                        ? `Show ${a.fullName} on student leaderboards`
                        : `Hide ${a.fullName} from student leaderboards`
                    }
                    title={hidden ? "Hidden from other students" : "Visible to other students"}
                  >
                    {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </td>
                <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted">{a.studentNumber}</td>
                {showClass && (
                  <td className="px-3 py-2 tabular-nums text-muted">
                    {a.classYear != null ? classYearShort(a.classYear) : "—"}
                  </td>
                )}
                <td className="px-3 py-2 text-muted">
                  <span className="block whitespace-nowrap">{a.classPeriod ?? "—"}</span>
                  {a.className && (
                    <span className="block max-w-[9rem] truncate text-[11px] text-muted/80" title={a.className}>
                      {a.className}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      a.participationType === "ATHLETE"
                        ? "bg-sky-400/15 text-sky-300"
                        : a.participationType === "PE"
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "text-muted"
                    )}
                  >
                    {participationLabel(a.participationType)}
                  </span>
                </td>
                <td className="max-w-[10rem] truncate px-3 py-2 text-muted" title={a.sports ?? undefined}>
                  {a.sports ?? "—"}
                </td>
                {ROSTER_COLUMNS.map((col) => (
                  <td key={col.slug} className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
                    {a.marks[col.slug]?.display ?? "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-card-border px-3 py-2 text-xs text-muted">
        {athletes.length} athlete{athletes.length === 1 ? "" : "s"} · eye = visible to other students ·
        slashed eye = name hidden on student leaderboards (coaches still see names)
      </p>
    </div>
  );
}
