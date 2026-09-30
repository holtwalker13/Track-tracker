import { DemoPasscodeForm } from "@/components/auth/demo-passcode-form";
import { DEMO_CLASS_LOGIN } from "@/lib/tenants";

export default async function DemoStudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <DemoPasscodeForm
      mode="student"
      title="Demo student"
      accountLabel={DEMO_CLASS_LOGIN.username}
      next={sp.next}
      error={sp.error}
    />
  );
}
