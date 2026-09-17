"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FilterPills } from "@/components/ui/filter-pills";

function ClassHourPillsInner({
  classes,
}: {
  classes: { id: string; name: string; period: string | null }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("classId") ?? "all";

  const pills = [
    { id: "all", label: "All hours" },
    ...classes.map((c) => ({
      id: c.id,
      label: c.period ? `${c.period} · ${c.name}` : c.name,
    })),
  ];

  function onSelect(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") params.delete("classId");
    else params.set("classId", id);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return <FilterPills pills={pills} activeId={activeId} onSelect={onSelect} />;
}

export function ClassHourPills({
  classes,
}: {
  classes: { id: string; name: string; period: string | null }[];
}) {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <ClassHourPillsInner classes={classes} />
    </Suspense>
  );
}

function ParticipationPillsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("type") ?? "all";

  function onSelect(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") params.delete("type");
    else params.set("type", id);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <FilterPills
      pills={[
        { id: "all", label: "All types" },
        { id: "ATHLETE", label: "Athletes" },
        { id: "PE", label: "PE" },
      ]}
      activeId={activeId}
      onSelect={onSelect}
    />
  );
}

export function ParticipationPills() {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <ParticipationPillsInner />
    </Suspense>
  );
}
