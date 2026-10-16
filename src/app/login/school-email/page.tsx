import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { loginDestination } from "@/lib/auth/login-destination";
import {
  loadSchoolEmailAccount,
  userMustClaimSchoolEmail,
} from "@/lib/auth/school-email-claim";
import { loginPolicyForSlug, schoolEmailHint } from "@/lib/school-login-email";
import { SchoolEmailClaimForm } from "@/components/auth/school-email-claim-form";

export default async function SchoolEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const next = loginDestination(session.role, sp.next);
  if (!(await userMustClaimSchoolEmail(session.userId))) redirect(next);

  const account = await loadSchoolEmailAccount(session.userId);
  const policy = loginPolicyForSlug(account?.schoolSlug);
  const audience = account?.audience;
  if (!account || !policy || !audience) redirect(next);

  const prefill =
    audience === "student" && account.rosterEmail?.includes("@") ? account.rosterEmail : "";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <p className="text-xs uppercase tracking-widest text-accent">Sign-in update</p>
        <h1 className="mt-2 text-2xl font-bold">Add your school email</h1>
        <p className="mt-3 text-sm text-muted">
          Track Tracker is switching to email and password. Your password stays the same. Enter the
          school email for this account — you will use that email the next time you sign in.
        </p>
        <p className="mt-2 text-sm text-foreground/90">{schoolEmailHint(policy, audience)}</p>
        <SchoolEmailClaimForm nextPath={next} defaultEmail={prefill} />
      </Card>
    </div>
  );
}
