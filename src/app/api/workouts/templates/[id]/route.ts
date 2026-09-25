import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseExerciseInput, type ExerciseInput } from "@/lib/services/workout-template-exercises";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.workoutTemplate.findFirst({
    where: { id, schoolId: session.schoolId },
    include: { _count: { select: { assignments: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const body = await request.json();
  const name = String(body.name ?? existing.name).trim();
  if (!name) {
    return NextResponse.json({ error: "Program name is required" }, { status: 400 });
  }

  const exercises: ExerciseInput[] = Array.isArray(body.exercises) ? body.exercises : [];
  if (exercises.length === 0) {
    return NextResponse.json({ error: "Add at least one lift" }, { status: 400 });
  }

  const slugs = exercises.map((e) => String(e.activitySlug ?? "").trim()).filter(Boolean);
  const activities = await prisma.activity.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(activities.map((a) => [a.slug, a.id]));
  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length > 0) {
    return NextResponse.json({ error: `Unknown lifts: ${missing.join(", ")}` }, { status: 400 });
  }

  let rec;
  try {
    rec = await prisma.$transaction(async (tx) => {
      const current = await tx.workoutTemplateExercise.findMany({
        where: { templateId: id },
        include: {
          activity: { select: { slug: true, name: true } },
          _count: { select: { setLogs: true } },
        },
      });
      const currentBySlug = new Map(current.map((row) => [row.activity.slug, row]));
      const keepIds = new Set<string>();

      for (const [i, input] of exercises.entries()) {
        const slug = String(input.activitySlug).trim();
        const activityId = bySlug.get(slug)!;
        const prev = currentBySlug.get(slug);
        const parsed = parseExerciseInput(input);

        if (prev) {
          keepIds.add(prev.id);
          await tx.workoutTemplateExercise.update({
            where: { id: prev.id },
            data: {
              defaultSets: parsed.defaultSets,
              defaultReps: parsed.defaultReps,
              setPrescriptions: parsed.setPrescriptions,
              notes: parsed.notes,
              sortOrder: i,
              activityId,
            },
          });
        } else {
          const created = await tx.workoutTemplateExercise.create({
            data: {
              templateId: id,
              activityId,
              defaultSets: parsed.defaultSets,
              defaultReps: parsed.defaultReps,
              setPrescriptions: parsed.setPrescriptions,
              notes: parsed.notes,
              sortOrder: i,
            },
          });
          keepIds.add(created.id);
        }
      }

      const blocked = current.filter(
        (row) => !keepIds.has(row.id) && row._count.setLogs > 0
      );
      if (blocked.length > 0) {
        const names = blocked.map((b) => b.activity.name).join(", ");
        throw new Error(
          `Cannot remove ${names} — athletes already logged sets. Uncheck them or leave them in the program.`
        );
      }

      await tx.workoutTemplateExercise.deleteMany({
        where: { templateId: id, id: { notIn: [...keepIds] } },
      });

      return tx.workoutTemplate.update({
        where: { id },
        data: { name },
        include: {
          exercises: {
            orderBy: { sortOrder: "asc" },
            include: { activity: { select: { slug: true, name: true } } },
          },
          _count: { select: { assignments: true } },
        },
      });
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update program" },
      { status: 400 }
    );
  }

  return NextResponse.json({ template: rec, hadAssignments: existing._count.assignments > 0 });
}
