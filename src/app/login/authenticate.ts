import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { findUserByCredential } from "@/lib/auth/credentials-login";
import { studentUsesBlockedSharedDemoPassword } from "@/lib/auth/demo-login-guard";
import { establishSessionFromUser } from "@/app/login/session-from-user";

export async function authenticateLogin(credential: string, password: string, nextRaw: string) {
  const user = await findUserByCredential(credential);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=1");
  }

  if (await studentUsesBlockedSharedDemoPassword(user)) {
    redirect("/login?error=1");
  }

  if ((user.role === "STUDENT" || user.role === "COACH") && !user.passwordSetAt) {
    redirect("/login?error=setup");
  }

  await establishSessionFromUser(user, nextRaw);
}
