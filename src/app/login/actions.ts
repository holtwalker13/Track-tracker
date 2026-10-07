"use server";

import { authenticateLogin } from "@/app/login/authenticate";

export async function loginAction(formData: FormData) {
  const credential = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const nextRaw = String(formData.get("next") ?? "");
  await authenticateLogin(credential, password, nextRaw);
}
