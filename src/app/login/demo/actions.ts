"use server";

import { redirect } from "next/navigation";
import {
  demoPasscodeMatches,
  resolveDemoAdminUser,
  resolveDemoStudentUser,
} from "@/lib/auth/demo-passcode-login";
import { establishSessionFromUser } from "@/app/login/actions";

export async function demoPasscodeLoginAction(formData: FormData) {
  const mode = String(formData.get("mode") ?? "");
  const passcode = String(formData.get("passcode") ?? "");
  const nextRaw = String(formData.get("next") ?? "");

  if (mode !== "admin" && mode !== "student") {
    redirect("/login?error=1");
  }

  if (!demoPasscodeMatches(passcode)) {
    redirect(mode === "admin" ? "/login/demo/admin?error=1" : "/login/demo/student?error=1");
  }

  const user =
    mode === "admin" ? await resolveDemoAdminUser() : await resolveDemoStudentUser();

  if (!user) {
    redirect(mode === "admin" ? "/login/demo/admin?error=missing" : "/login/demo/student?error=missing");
  }

  await establishSessionFromUser(user, nextRaw);
}
