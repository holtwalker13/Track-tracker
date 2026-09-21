import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STUDENT") redirect("/student");
  if (session.role === "ADMIN" && !session.schoolId) redirect("/admin");
  redirect("/coach/leaderboards");
}
