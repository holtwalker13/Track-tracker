export type JsonResult =
  | { ok: true; status: number; data: Record<string, unknown> }
  | { ok: false; status: number; error: string; offline: boolean };

/** A save indicator is true only after the server confirms the write. */
export function wasSaved(data: { saved?: unknown } | null | undefined): boolean {
  return data?.saved === true;
}

export async function requestJson(
  url: string,
  init: { method: "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown },
  options?: { redirectOnUnauthorized?: boolean }
): Promise<JsonResult> {
  const redirectOnUnauthorized = options?.redirectOnUnauthorized !== false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      ok: false,
      status: 0,
      offline: true,
      error: "No connection. Nothing was saved.",
    };
  }

  try {
    const res = await fetch(url, {
      method: init.method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
      window.location.assign("/login?error=session");
      return {
        ok: false,
        status: 401,
        offline: false,
        error: "Your session expired. Sign in again. Nothing was saved.",
      };
    }
    if (!res.ok) {
      const error =
        typeof data.error === "string" ? data.error : "Could not complete that request. Nothing was saved.";
      return { ok: false, status: res.status, offline: false, error };
    }
    return { ok: true, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      offline: true,
      error: "No connection. Nothing was saved.",
    };
  }
}

/**
 * Serializes saves per key and keeps only the latest payload, so a blur and a
 * tap cannot fire two requests for the same row.
 */
export function createSaveQueue<T>(run: (value: T) => Promise<void>) {
  const latest = new Map<string, T>();
  const running = new Set<string>();

  return async function enqueue(key: string, value: T): Promise<void> {
    latest.set(key, value);
    if (running.has(key)) return;
    running.add(key);
    try {
      while (latest.has(key)) {
        const next = latest.get(key) as T;
        latest.delete(key);
        await run(next);
      }
    } finally {
      running.delete(key);
      if (latest.has(key)) {
        const pending = latest.get(key) as T;
        void enqueue(key, pending);
      }
    }
  };
}
