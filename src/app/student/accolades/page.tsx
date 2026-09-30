import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getAccoladeProgressForStudent } from "@/lib/gamification/engine";
import {
  ACCOLADE_CATEGORY_LABELS,
  type AccoladeCategory,
} from "@/lib/gamification/accolade-definitions";
import { ensureAccoladeDefinitions } from "@/lib/gamification/seed-accolades";
import { prisma } from "@/lib/db";
import { XP_REASON_LABELS, type XpReason } from "@/lib/gamification/xp";

const CATEGORY_ORDER: AccoladeCategory[] = [
  "consistency",
  "prs",
  "improvement",
  "strength",
  "milestones",
];

export default async function StudentAccoladesPage() {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  await ensureAccoladeDefinitions();
  const progress = await getAccoladeProgressForStudent(session.studentId);

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: ACCOLADE_CATEGORY_LABELS[cat],
    items: progress.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <AppShell title="Accolades" nav={STUDENT_NAV}>
      <p className="text-sm text-muted">
        Earn badges for consistency, PRs, strength milestones, and more. Locked accolades show your
        progress.
      </p>

      <div className="mt-6 space-y-8">
        {byCategory.map((group) => (
          <section key={group.category}>
            <h2 className="text-lg font-semibold">{group.label}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {group.items.map((item) => (
                <Card
                  key={item.slug}
                  className={item.earned ? "border-success/40" : "opacity-90"}
                >
                  <CardTitle className="flex items-center gap-2">
                    <span>{item.emoji}</span>
                    <span>{item.name}</span>
                    {!item.earned && (
                      <span className="ml-auto text-xs font-normal text-muted">Locked</span>
                    )}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted">{item.description}</p>
                  {item.earned && item.earnedAt && (
                    <p className="mt-2 text-xs text-success">
                      Earned {item.earnedAt.toLocaleDateString()}
                    </p>
                  )}
                  {!item.earned && item.progressLabel && (
                    <p className="mt-3 text-sm font-medium">{item.progressLabel}</p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
