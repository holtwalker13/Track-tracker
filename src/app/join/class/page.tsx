import { Suspense } from "react";
import { ClassJoinForm } from "@/components/auth/class-join-form";

export default async function ClassJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token?.trim();
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted">
        Missing class link. Open the QR code or link from your coach.
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted">Opening class…</div>}>
      <ClassJoinForm token={token} />
    </Suspense>
  );
}
