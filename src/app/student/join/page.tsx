import { Suspense } from "react";
import { StudentJoinForm } from "@/components/auth/student-join-form";

export default async function StudentJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token?.trim();

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted">
        Missing invite token. Open the link your coach sent you.
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>
      }
    >
      <StudentJoinForm token={token} />
    </Suspense>
  );
}
