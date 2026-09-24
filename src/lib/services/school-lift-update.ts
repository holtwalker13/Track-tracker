import { prisma } from "@/lib/db";
import { DEFAULT_AGE_BRACKET, isAgeBracketId } from "@/lib/age-brackets";
import { MEDALS } from "@/lib/kpi-targets";

export async function syncSchoolLiftTargets(input: {
  schoolId: string;
  metricSlug: string;
  ageBrackets: string[];
  genders: Array<"F" | "M">;
  targets?: Record<string, Record<string, Record<string, number>>>;
}) {
  const brackets = input.ageBrackets.filter((b) => isAgeBracketId(String(b)));
  const bracketList = brackets.length ? brackets : [DEFAULT_AGE_BRACKET];
  const genders = input.genders.filter((g) => g === "F" || g === "M");
  const genderList = genders.length ? genders : (["F", "M"] as const);

  await prisma.schoolKpiTarget.deleteMany({
    where: { schoolId: input.schoolId, metricSlug: input.metricSlug },
  });

  if (!input.targets) return;

  const rows: {
    schoolId: string;
    gender: string;
    medal: string;
    metricSlug: string;
    target: number;
    ageBracket: string;
  }[] = [];

  for (const bracket of bracketList) {
    for (const gender of genderList) {
      for (const medal of MEDALS) {
        const target = Number(input.targets?.[bracket]?.[gender]?.[medal]);
        if (!Number.isFinite(target)) continue;
        rows.push({
          schoolId: input.schoolId,
          gender,
          medal,
          metricSlug: input.metricSlug,
          target,
          ageBracket: bracket,
        });
      }
    }
  }

  if (rows.length) {
    await prisma.schoolKpiTarget.createMany({ data: rows, skipDuplicates: true });
  }
}
