import { AppShell } from "@/components/layout/app-shell";
import { HubTabs } from "@/components/layout/hub-tabs";
import { COACH_NAV, SCHOOL_HUB_TABS } from "@/lib/navigation";

export default function SchoolHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="School" nav={COACH_NAV}>
      <HubTabs tabs={[...SCHOOL_HUB_TABS]} />
      {children}
    </AppShell>
  );
}
