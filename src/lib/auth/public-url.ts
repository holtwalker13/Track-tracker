/**
 * Build public absolute URLs for redirects behind Railway's proxy.
 * Never use request.url alone — with HOSTNAME/bind 0.0.0.0, Next can redirect
 * browsers to https://0.0.0.0:8080/...
 */
export function publicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host") ?? "").split(",")[0]?.trim();
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host?.includes("localhost") || host?.startsWith("127.") ? "http" : "https");

  if (host && !host.startsWith("0.0.0.0") && !host.startsWith("[::]")) {
    return `${proto}://${host}`;
  }

  const fallback = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.PUBLIC_URL;
  if (fallback) {
    return fallback.startsWith("http") ? fallback.replace(/\/$/, "") : `https://${fallback}`;
  }

  // Last resort: strip 0.0.0.0 from whatever Next saw
  try {
    const u = new URL(request.url);
    if (u.hostname === "0.0.0.0" || u.hostname === "::") {
      return `${proto}://localhost${u.port ? `:${u.port}` : ""}`;
    }
    return u.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function publicUrl(request: Request, path: string): URL {
  const base = publicOrigin(request);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, base.endsWith("/") ? base : `${base}/`);
}
