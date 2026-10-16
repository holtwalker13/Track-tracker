"use client";

import { useCallback, useEffect, useState } from "react";

type Snapshot = {
  leaderboardsEnabledForStudents: boolean;
  peerLeaderboardsEnabled: boolean;
  studentLeaderboardDisplayMode: "PSEUDONYM" | "LEGAL_NAME";
  dataRetentionYears: number | null;
  activeAuthorization: {
    id: string;
    status: string;
    authorizingOfficialName: string;
    authorizationDate: string | null;
    privacyNoticeVersion: string | null;
    agreementVersion: string | null;
  } | null;
};

type AuditRow = {
  id: string;
  action: string;
  outcome: string;
  createdAt: string;
  actorRole: string | null;
};

export function SchoolPrivacyPanel() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [settingsRes, auditRes] = await Promise.all([
      fetch("/api/privacy/settings"),
      fetch("/api/privacy/audit?limit=25"),
    ]);
    const settings = await settingsRes.json();
    const auditJson = await auditRes.json();
    if (settingsRes.ok) setSnapshot(settings);
    if (auditRes.ok) setAudit(auditJson.events ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(patch: Partial<Snapshot>) {
    setMessage(null);
    const res = await fetch("/api/privacy/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Could not save settings");
      return;
    }
    setSnapshot(data);
    setMessage("Settings saved.");
    void load();
  }

  if (loading && !snapshot) {
    return <p className="text-sm text-muted">Loading privacy settings…</p>;
  }

  if (!snapshot) {
    return <p className="text-sm text-danger">Unable to load privacy settings.</p>;
  }

  const auth = snapshot.activeAuthorization;

  return (
    <div className="space-y-8 max-w-3xl">
      <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <h2 className="text-lg font-semibold">Leaderboard visibility</h2>
        <p className="text-sm text-muted">
          Defaults favor pseudonyms and authenticated audiences. Leaderboards are never public to anonymous visitors.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={snapshot.leaderboardsEnabledForStudents}
            onChange={(e) => void saveSettings({ leaderboardsEnabledForStudents: e.target.checked })}
          />
          Students can open the Leaderboards page
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={snapshot.peerLeaderboardsEnabled}
            onChange={(e) => void saveSettings({ peerLeaderboardsEnabled: e.target.checked })}
          />
          Students can see peer rankings (when enabled above)
        </label>
        <label className="block text-sm">
          <span className="text-muted">Display mode for students</span>
          <select
            className="mt-1 block w-full rounded border border-border bg-background px-2 py-1"
            value={snapshot.studentLeaderboardDisplayMode}
            onChange={(e) =>
              void saveSettings({
                studentLeaderboardDisplayMode: e.target.value as "PSEUDONYM" | "LEGAL_NAME",
              })
            }
          >
            <option value="PSEUDONYM">Pseudonym (Student ####)</option>
            <option value="LEGAL_NAME">Legal name (school-approved)</option>
          </select>
        </label>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 space-y-2">
        <h2 className="text-lg font-semibold">Under-13 school authorization (COPPA pathway)</h2>
        <p className="text-sm text-muted">
          Collecting personal information from students under 13 requires an active school authorization record. Coach
          self-signup does not activate this status.
        </p>
        {auth ? (
          <div className="text-sm space-y-1">
            <p>
              Status: <strong>{auth.status}</strong>
            </p>
            <p>
              Official: {auth.authorizingOfficialName}
              {auth.authorizationDate ? ` · ${new Date(auth.authorizationDate).toLocaleDateString()}` : ""}
            </p>
            <p className="text-muted">
              Notice v{auth.privacyNoticeVersion ?? "—"} · Agreement v{auth.agreementVersion ?? "—"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-warning">No active authorization on file. Under-13 enrollment is blocked.</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 space-y-2">
        <h2 className="text-lg font-semibold">Recent security audit events</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted">No events recorded for this school yet.</p>
        ) : (
          <ul className="text-sm divide-y divide-border">
            {audit.map((row) => (
              <li key={row.id} className="py-2 flex justify-between gap-4">
                <span>
                  {row.action} · {row.outcome}
                </span>
                <span className="text-muted shrink-0">{new Date(row.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {message ? <p className="text-sm text-accent">{message}</p> : null}
    </div>
  );
}
