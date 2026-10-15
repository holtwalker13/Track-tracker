"use client";

import { InviteLinkActions } from "@/components/auth/invite-link-actions";

export function ClassJoinLink({ classId, className }: { classId: string; className: string }) {
  async function fetchUrlPath() {
    const res = await fetch(`/api/classes/${classId}/join-link`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not create class link");
    return String(data.urlPath);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">Class link</span>
      <InviteLinkActions
        subjectLabel={className}
        fetchUrlPath={fetchUrlPath}
        copyTitle={`Copy class account link for ${className}`}
        qrTitle={`Show class QR code for ${className}`}
      />
    </div>
  );
}
