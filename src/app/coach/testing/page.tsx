import { redirect } from "next/navigation";

export default async function TestingSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ coachId?: string; classId?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.coachId?.trim()) params.set("coachId", sp.coachId.trim());
  if (sp.classId?.trim()) params.set("classId", sp.classId.trim());
  redirect(params.toString() ? `/coach/programs?${params.toString()}` : "/coach/programs");
}
