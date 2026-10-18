import { generateLoginCode } from "@/lib/auth/email-login-code";
import { sendLoginCodeEmail } from "@/lib/email/send-login-code";

export type SendTestLoginCodeResult =
  | { ok: true; devCodeLogged: boolean }
  | { ok: false; error: string };

/** Fire a single login-code email (admin Resend smoke test). */
export async function sendTestLoginCodeEmail(input: {
  to: string;
  firstName?: string;
}): Promise<SendTestLoginCodeResult> {
  const to = input.to.trim();
  if (!to.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const code = generateLoginCode();
  const sent = await sendLoginCodeEmail({
    to,
    code,
    firstName: input.firstName?.trim() || "Tester",
  });
  if (!sent.ok) return sent;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const devCodeLogged = !apiKey && process.env.NODE_ENV !== "production" && process.env.APP_MODE !== "production";
  return { ok: true, devCodeLogged };
}
