"use client";

import { useEffect, useState } from "react";

export function ConnectionBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function sync() {
      setOffline(navigator.onLine === false);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="bg-sport-red px-4 py-3 text-center text-sm font-semibold text-background"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      No connection. Unsaved changes stay unsaved until you are back online.
    </div>
  );
}
