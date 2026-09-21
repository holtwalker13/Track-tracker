"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EnterSchoolButton({ schoolId, active }: { schoolId: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function enter() {
    setPending(true);
    await fetch("/api/admin/switch-school", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId }),
    });
    router.push("/coach/students");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void enter()}
      disabled={pending}
      className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background disabled:opacity-50"
    >
      {pending ? "Opening…" : active ? "Continue in this school" : "Enter school"}
    </button>
  );
}
