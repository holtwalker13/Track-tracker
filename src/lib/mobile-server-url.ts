/**
 * Resolves the origin the iOS shell loads. Used by Capacitor sync only.
 * The web app keeps calling relative `/api` URLs and never embeds this value.
 */

export type CapacitorServerKind = "bundled-shell" | "staging" | "development";

export type CapacitorServerResolution = {
  url: string | null;
  cleartext: boolean;
  kind: CapacitorServerKind;
  error?: string;
};

const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "staging.example.up.railway.app",
  "your-staging-host.up.railway.app",
]);

function fail(error: string): CapacitorServerResolution {
  return { url: null, cleartext: false, kind: "bundled-shell", error };
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
  if (host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  const match = /^172\.(\d+)\./.exec(host);
  if (!match) return false;
  const octet = Number(match[1]);
  return octet >= 16 && octet <= 31;
}

function parseOrigin(raw: string, label: string): { ok: true; origin: string; protocol: string; hostname: string } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: `${label} must be an http:// or https:// origin.` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: `${label} must start with https://.` };
  }
  if (url.username || url.password) {
    return {
      ok: false,
      error: `${label} must not include a username or password. Keep backend credentials on the server.`,
    };
  }
  if (url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    return {
      ok: false,
      error: `${label} must be an origin only, with no path, query, or fragment.`,
    };
  }
  return { ok: true, origin: url.origin, protocol: url.protocol, hostname: url.hostname };
}

export function resolveCapacitorServer(input: {
  serverUrl?: string | null;
  devServerUrl?: string | null;
}): CapacitorServerResolution {
  const dev = input.devServerUrl?.trim() ?? "";
  const server = input.serverUrl?.trim() ?? "";

  if (dev) {
    const parsed = parseOrigin(dev, "CAPACITOR_DEV_SERVER_URL");
    if (!parsed.ok) return fail(parsed.error);
    if (parsed.protocol === "http:" && !isPrivateHostname(parsed.hostname)) {
      return fail(
        "CAPACITOR_DEV_SERVER_URL must be a private-network http:// address or https://. Live reload stays in development."
      );
    }
    return {
      url: parsed.origin,
      cleartext: parsed.protocol === "http:",
      kind: "development",
    };
  }

  if (!server) {
    return { url: null, cleartext: false, kind: "bundled-shell" };
  }

  const parsed = parseOrigin(server, "CAPACITOR_SERVER_URL");
  if (!parsed.ok) return fail(parsed.error);
  if (parsed.protocol !== "https:") {
    return fail(
      "CAPACITOR_SERVER_URL must be https://. Put a local live-reload address in CAPACITOR_DEV_SERVER_URL, and leave that unset for iPhone builds."
    );
  }
  if (PLACEHOLDER_HOSTS.has(parsed.hostname.toLowerCase())) {
    return fail("Replace CAPACITOR_SERVER_URL with the real staging HTTPS origin before syncing iOS.");
  }
  return { url: parsed.origin, cleartext: false, kind: "staging" };
}
