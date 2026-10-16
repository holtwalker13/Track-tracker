import { requireSchoolSession } from "@/lib/auth/session";
import { SchoolPrivacyPanel } from "@/components/privacy/school-privacy-panel";

export default async function SchoolPrivacyPage() {
  await requireSchoolSession(["COACH", "ADMIN"]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Privacy &amp; security</h1>
        <p className="text-sm text-muted max-w-2xl">
          Configure leaderboard visibility, review school authorization status, and inspect recent security audit
          events. Legal agreements and district policies require human review — see{" "}
          <code className="text-xs">docs/compliance/</code>.
        </p>
      </div>
      <SchoolPrivacyPanel />
    </div>
  );
}
