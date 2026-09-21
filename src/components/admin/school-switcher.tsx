"use client";

import { useRouter } from "next/navigation";

export function SchoolSwitcher({
  schools,
  currentSchoolId,
}: {
  schools: { id: string; name: string; slug: string }[];
  currentSchoolId?: string;
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
    if (res.ok) router.push("/coach/students");
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="hidden sm:inline">School</span>
      <select
        value={currentSchoolId ?? ""}
        onChange={(e) => void onChange(e.target.value)}
        className="max-w-[12rem] rounded-lg border border-card-border bg-card px-2 py-1.5 text-sm text-foreground"
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
