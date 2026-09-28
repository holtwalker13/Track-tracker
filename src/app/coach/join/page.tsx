import { CoachJoinForm } from "@/components/auth/coach-join-form";

export default async function CoachJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token?.trim();

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted">
        Missing invite token. Open the link or QR code your admin sent you.
      </div>
    );
  }

  return <CoachJoinForm token={token} />;
}
