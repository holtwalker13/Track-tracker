import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { sendTestLoginCodeEmail } from "@/lib/email/send-test-login-code";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { clientIpHint } from "@/lib/security/audit-log";

export async function POST(request: Request) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }

  const ip = clientIpHint(request) ?? "unknown";
  const limit = checkRateLimit(rateLimitKey("admin-resend-test", ip), 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many test emails. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const to = String(body.to ?? "").trim();
  const sent = await sendTestLoginCodeEmail({ to });
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error }, { status: sent.error.includes("email") ? 400 : 503 });
  }

  return NextResponse.json({
    ok: true,
    message: sent.devCodeLogged
      ? "No RESEND_API_KEY — check server logs for the 6-digit code."
      : "Test code sent. Check the inbox (and spam).",
  });
}
