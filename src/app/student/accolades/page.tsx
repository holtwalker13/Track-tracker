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
import { AccoladeProgressCard } from "@/components/gamification/accolade-progress-card";
import { AccoladeCategoryHeading } from "@/components/gamification/accolade-category-heading";
import { Sparkles } from "lucide-react";

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
  const xpHistory = await prisma.xpTransaction.findMany({
    where: { studentId: session.studentId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

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

      {xpHistory.length > 0 && (
        <Card className="mt-6 border-accent/30 bg-accent/5">
          <CardTitle className="flex items-center gap-2 text-accent">
            <Sparkles className="h-5 w-5" aria-hidden />
            XP history
          </CardTitle>
          <ul className="mt-4 space-y-2 text-sm">
            {xpHistory.map((tx) => (
              <li key={tx.id} className="flex justify-between gap-4">
                <span className="font-medium text-sport-gold">
                  +{tx.amount} — {XP_REASON_LABELS[tx.reason as XpReason] ?? tx.reason}
                </span>
                <span className="shrink-0 text-muted">
                  {tx.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-8 space-y-10">
        {byCategory.map((group) => (
          <section key={group.category}>
            <AccoladeCategoryHeading category={group.category} label={group.label} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {group.items.map((item) => (
                <AccoladeProgressCard
                  key={item.slug}
                  slug={item.slug}
                  name={item.name}
                  description={item.description}
                  category={item.category}
                  earned={item.earned}
                  earnedAt={item.earnedAt}
                  progressLabel={item.progressLabel}
                  progressCurrent={item.progressCurrent}
                  progressTarget={item.progressTarget}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
