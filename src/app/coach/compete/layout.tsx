import { AppShell } from "@/components/layout/app-shell";
import { HubTabs } from "@/components/layout/hub-tabs";
import { COACH_NAV, COMPETE_HUB_TABS } from "@/lib/navigation";

export default function CompeteHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="Compete" nav={COACH_NAV}>
      <HubTabs tabs={[...COMPETE_HUB_TABS]} />
      {children}
    </AppShell>
  );
}
