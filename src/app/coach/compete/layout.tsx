import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";

export default async function CompeteHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="Compete" nav={COACH_NAV} navCompact mobileCoachChrome>
      {children}
    </AppShell>
  );
}
