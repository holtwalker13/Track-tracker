import { redirect } from "next/navigation";

export default function SchoolOverviewRedirectPage() {
  redirect("/coach/school/coaches");
}
