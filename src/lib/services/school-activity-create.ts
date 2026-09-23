import { prisma } from "@/lib/db";
import { KPI_CATEGORIES } from "@/lib/age-brackets";
import { MEDALS } from "@/lib/kpi-targets";
import { DEFAULT_AGE_BRACKET, isAgeBracketId } from "@/lib/age-brackets";

export function slugifyActivityName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function createSchoolActivity(input: {
  schoolId: string;
  title: string;
  categorySlug: string;
  unit: string;
  direction: "HIGHER_BETTER" | "LOWER_BETTER";
  bodyweightInfluenced?: boolean;
  ageBrackets?: string[];
  genders?: Array<"F" | "M">;
  targets?: Record<string, Record<string, Record<string, number>>>;
}) {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  if (!KPI_CATEGORIES.some((c) => c.slug === input.categorySlug)) {
    throw new Error("Invalid category");
  }

  let category = await prisma.activityCategory.findUnique({
    where: { slug: input.categorySlug },
  });
  if (!category) {
    category = await prisma.activityCategory.create({
      data: {
        slug: input.categorySlug,
        name: KPI_CATEGORIES.find((c) => c.slug === input.categorySlug)?.name ?? input.categorySlug,
        sortOrder: 50,
      },
    });
  }

  const base = slugifyActivityName(title) || "custom";
  let slug = `school-${input.schoolId.slice(-6)}-${base}`;
  let n = 1;
  while (await prisma.activity.findUnique({ where: { slug } })) {
    slug = `school-${input.schoolId.slice(-6)}-${base}-${n++}`;
  }

  const activity = await prisma.activity.create({
    data: {
      slug,
      name: title,
      categoryId: category.id,
      unit: input.unit,
      scoringDirection: input.direction,
      acceptsDecimals: input.unit !== "reps",
      schoolId: input.schoolId,
      bodyweightInfluenced: input.bodyweightInfluenced ?? input.unit === "x BW",
      genderInfluenced: true,
      ageInfluenced: true,
    },
    include: { category: true },
  });

  const ageBrackets =
    input.ageBrackets?.filter((b) => isAgeBracketId(String(b))) ?? [DEFAULT_AGE_BRACKET];
  const genders = input.genders?.filter((g) => g === "F" || g === "M") ?? ["F", "M"];

  if (input.targets) {
    const rows: {
      schoolId: string;
      gender: string;
      medal: string;
      metricSlug: string;
      target: number;
      ageBracket: string;
    }[] = [];
    for (const bracket of ageBrackets) {
      for (const gender of genders) {
        for (const medal of MEDALS) {
          const target = Number(input.targets?.[bracket]?.[gender]?.[medal]);
          if (!Number.isFinite(target)) continue;
          rows.push({
            schoolId: input.schoolId,
            gender,
            medal,
            metricSlug: activity.slug,
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

  return activity;
}

export async function deleteSchoolCustomActivity(schoolId: string, slug: string) {
  const custom = await prisma.activity.findFirst({
    where: { slug, schoolId },
  });
  if (!custom) return null;

  const templateExerciseIds = (
    await prisma.workoutTemplateExercise.findMany({
      where: { activityId: custom.id },
      select: { id: true },
    })
  ).map((e) => e.id);

  await prisma.$transaction([
    prisma.workoutSetLog.deleteMany({
      where: { templateExerciseId: { in: templateExerciseIds } },
    }),
    prisma.workoutTemplateExercise.deleteMany({ where: { activityId: custom.id } }),
    prisma.schoolKpiTarget.deleteMany({ where: { schoolId, metricSlug: slug } }),
    prisma.schoolHiddenKpi.deleteMany({ where: { schoolId, metricSlug: slug } }),
    prisma.schoolHiddenLift.deleteMany({ where: { schoolId, activitySlug: slug } }),
    prisma.testingSessionActivity.deleteMany({ where: { activityId: custom.id } }),
    prisma.benchmarkValue.deleteMany({ where: { activityId: custom.id } }),
    prisma.performanceResult.deleteMany({ where: { activityId: custom.id } }),
    prisma.activity.delete({ where: { id: custom.id } }),
  ]);

  return custom;
}
