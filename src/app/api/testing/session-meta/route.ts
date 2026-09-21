import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const testingSession = await prisma.testingSession.findUnique({
    where: { id: sessionId },
    include: {
      students: { include: { student: true } },
      activities: { include: { activity: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!testingSession || testingSession.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    students: testingSession.students.map((s) => ({
      id: s.studentId,
      name: `${s.student.firstName} ${s.student.lastName}`,
    })),
    activities: testingSession.activities.map((a) => ({
      id: a.activityId,
      name: a.activity.name,
      slug: a.activity.slug,
    })),
  });
}
