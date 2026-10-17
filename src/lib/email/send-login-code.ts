type SendResult = { ok: true } | { ok: false; error: string };

/** Email the 6-digit class-link code. Uses Resend when RESEND_API_KEY is set. */
export async function sendLoginCodeEmail(input: {
  to: string;
  code: string;
  firstName: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Track Tracker <login@tracktracker.app>";
  const subject = "Your Track Tracker code";
  const text = `Hi ${input.firstName}, your Track Tracker code is ${input.code}. It expires in 10 minutes.`;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production" || process.env.APP_MODE === "production") {
      return { ok: false, error: "We could not email a code right now. Ask your coach to try again later." };
    }
    console.info(`[email] login code for ${input.to}: ${input.code}`);
    return { ok: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    return { ok: false, error: "We could not email that code. Check the address and try again." };
  }
  return { ok: true };
}
