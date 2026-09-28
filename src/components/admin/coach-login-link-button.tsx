"use client";

import { InviteLinkActions } from "@/components/auth/invite-link-actions";
import type { CoachLoginStatus } from "@/lib/services/coach-login-invite";

export function CoachLoginLinkButton({
  coachProfileId,
  fullName,
  loginStatus,
}: {
  coachProfileId: string;
  fullName: string;
  loginStatus: CoachLoginStatus;
}) {
  async function fetchUrlPath() {
    const res = await fetch(`/api/admin/coaches/${coachProfileId}/login-invite`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      const msg = typeof data.error === "string" ? data.error : "Could not create link";
      throw new Error(msg.length > 120 ? "Could not create link" : msg);
    }
    return String(data.urlPath);
  }

  return (
    <InviteLinkActions
      subjectLabel={fullName}
      active={loginStatus === "active"}
      pendingInvite={loginStatus === "invite"}
      fetchUrlPath={fetchUrlPath}
      copyTitle={
        loginStatus === "active"
          ? `Copy password reset link for coach ${fullName}`
          : `Copy coach setup link for ${fullName}`
      }
    />
  );
}
