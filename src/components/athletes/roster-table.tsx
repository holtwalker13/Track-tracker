"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { ROSTER_COLUMNS, type RosterAthlete } from "@/lib/queries/roster";
import { StudentLoginLinkButton } from "@/components/athletes/student-login-link-button";
import { RosterUsernameField } from "@/components/athletes/roster-username-field";
import { RosterEmailField } from "@/components/athletes/roster-email-field";
import { classYearShort } from "@/lib/grades";
import { cn } from "@/lib/utils";

type SortKey =
  | "firstName"
  | "lastName"
  | "studentNumber"
  | "username"
  | "rosterEmail"
  | "classYear"
  | "sports"
  | "participationType"
  | "nameHidden"
  | "loginStatus"
  | (typeof ROSTER_COLUMNS)[number]["slug"];

function participationLabel(value: string | null) {
  if (value === "ATHLETE") return "Athlete";
  if (value === "PE") return "PE";
  return "—";
}

export function RosterTable({
  athletes,
  columns = [],
}: {
  athletes: RosterAthlete[];
  columns?: { slug: string; label: string }[];
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("lastName");
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
    setSortDir(
      key === "firstName" ||
        key === "lastName" ||
        key === "studentNumber" ||
        key === "username" ||
        key === "rosterEmail"
        ? "asc"
        : "desc"
    );
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
      if (sortKey === "loginStatus") {
        const order = { none: 0, invite: 1, active: 2 };
        return (order[a.loginStatus] - order[b.loginStatus]) * dir;
      }
      const markSlug = columns.find((c) => c.slug === sortKey)?.slug;
      if (markSlug) {
        const av = a.marks[markSlug]?.value;
        const bv = b.marks[markSlug]?.value;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av - bv) * dir;
      }
      const text = (row: RosterAthlete) =>
        sortKey === "firstName"
          ? row.firstName
          : sortKey === "lastName"
            ? row.lastName
            : sortKey === "studentNumber"
              ? row.studentNumber
              : sortKey === "username"
                ? row.username ?? row.usernameHint
                : sortKey === "rosterEmail"
                  ? row.rosterEmail ?? ""
                  : sortKey === "classYear"
                  ? String(row.classYear ?? "")
                  : sortKey === "sports"
                    ? row.sports ?? ""
                    : sortKey === "participationType"
                      ? row.participationType ?? ""
                      : "";
      const astr = text(a);
      const bstr = text(b);
      return astr.localeCompare(bstr, undefined, { numeric: true, sensitivity: "base" }) * dir;
    });
    return copy;
  }, [athletes, sortDir, sortKey, hiddenById]);

  async function deleteSelected() {
    if (selected.size === 0) return;
    const count = selected.size;
    if (
      !confirm(
        `Delete ${count} student${count === 1 ? "" : "s"}? This removes their profile, marks, and login access. This cannot be undone.`
      )
    ) {
      return;
    }
    setPending(true);
    const res = await fetch("/api/students/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: [...selected] }),
    });
    setPending(false);
    if (!res.ok) return;
    setSelected(new Set());
    router.refresh();
  }

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
    <RosterHorizontalScroll>
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
          <button
            type="button"
            disabled={pending}
            onClick={() => void deleteSelected()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
          >
            Delete
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
            <Header label="First" sortId="firstName" />
            <Header label="Last" sortId="lastName" />
            <Header label="Visible" sortId="nameHidden" />
            <Header label="Login" sortId="loginStatus" />
            <Header label="Username" sortId="username" />
            <Header label="Email" sortId="rosterEmail" />
            <Header label="ID" sortId="studentNumber" />
            <Header label="Year" sortId="classYear" />
            <Header label="Type" sortId="participationType" />
            <Header label="Sports" sortId="sports" />
            {columns.map((col) => (
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
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  <Link href={`/coach/students/${a.studentId}`} className="hover:text-accent">
                    {a.firstName}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  <Link href={`/coach/students/${a.studentId}`} className="hover:text-accent">
                    {a.lastName}
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
                <td className="px-3 py-2">
                  <StudentLoginLinkButton
                    studentId={a.studentId}
                    fullName={a.fullName}
                    loginStatus={a.loginStatus}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <RosterUsernameField
                    studentId={a.studentId}
                    username={a.username}
                    usernameHint={a.usernameHint}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <RosterEmailField studentId={a.studentId} rosterEmail={a.rosterEmail} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums text-muted">
                  {a.studentNumber}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted">
                  {a.classYear != null ? classYearShort(a.classYear) : "—"}
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
                <td className="whitespace-nowrap px-3 py-2 text-muted" title={a.sports ?? undefined}>
                  {a.sports ?? "—"}
                </td>
                {columns.map((col) => (
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
        {athletes.length} student{athletes.length === 1 ? "" : "s"} · type an email and click away to
        save it · username = sign-in handle · eye = visible to other students
      </p>
    </RosterHorizontalScroll>
  );
}

function RosterHorizontalScroll({ children }: { children: ReactNode }) {
  const topRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    const body = bodyRef.current;
    const spacer = spacerRef.current;
    if (!body || !spacer) return;
    const syncWidth = () => {
      spacer.style.width = `${body.scrollWidth}px`;
    };
    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(body);
    const table = body.querySelector("table");
    if (table) observer.observe(table);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div className="rounded-xl border border-card-border">
      <div
        ref={topRef}
        onScroll={() => {
          if (syncing.current || !topRef.current || !bodyRef.current) return;
          syncing.current = true;
          bodyRef.current.scrollLeft = topRef.current.scrollLeft;
          syncing.current = false;
        }}
        className="h-4 overflow-x-auto overflow-y-hidden border-b border-card-border/60"
        aria-hidden
      >
        <div ref={spacerRef} className="h-4" />
      </div>
      <div
        ref={bodyRef}
        onScroll={() => {
          if (syncing.current || !topRef.current || !bodyRef.current) return;
          syncing.current = true;
          topRef.current.scrollLeft = bodyRef.current.scrollLeft;
          syncing.current = false;
        }}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
