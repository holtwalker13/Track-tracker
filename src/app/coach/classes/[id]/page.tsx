import { redirect } from "next/navigation";

export default async function ClassDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/coach/school/classes/${id}`);
}
