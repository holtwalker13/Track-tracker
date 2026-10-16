import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = Math.min(100, Number(new URL(request.url).searchParams.get("limit") ?? 50));
  const rows = await prisma.securityAuditLog.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ events: rows });
}
