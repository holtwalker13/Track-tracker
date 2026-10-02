"use client";

import { useRouter } from "next/navigation";

export function SchoolSwitcher({
  schools,
  currentSchoolId,
  layout = "inline",
}: {
  schools: { id: string; name: string }[];
  currentSchoolId?: string;
  layout?: "inline" | "toolbar";
}) {
  const router = useRouter();

  async function onChange(schoolId: string) {
    if (!schoolId) {
      router.push("/admin");
      return;
    }
    const res = await fetch("/api/admin/switch-school", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId }),
    });
    if (res.ok) router.push("/coach/school/roster");
    router.refresh();
  }

  const toolbar = layout === "toolbar";

  return (
    <label
      className={
        toolbar
          ? "flex w-full min-w-0 items-center gap-2 text-xs text-muted sm:w-auto sm:min-w-[14rem] sm:flex-1 sm:max-w-md"
          : "flex items-center gap-2 text-xs text-muted"
      }
    >
      <span className="w-12 shrink-0 font-semibold uppercase tracking-wide sm:w-auto">
        School
      </span>
      <select
        value={currentSchoolId ?? ""}
        onChange={(e) => void onChange(e.target.value)}
        className={
          toolbar
            ? "min-w-0 flex-1 rounded-lg border border-card-border bg-card px-2.5 py-2 text-sm text-foreground"
            : "max-w-[12rem] rounded-lg border border-card-border bg-card px-2 py-1.5 text-sm text-foreground"
        }
      >
        <option value="">All schools</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
