import { DemoPasscodeForm } from "@/components/auth/demo-passcode-form";
import { ADMIN_LOGIN } from "@/lib/tenants";

export default async function DemoAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <DemoPasscodeForm
      mode="admin"
      title="App admin"
      accountLabel={ADMIN_LOGIN.email}
      next={sp.next}
      error={sp.error}
    />
  );
}
