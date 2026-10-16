import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { loginPolicyForSlug, normalizeLoginEmail } from "@/lib/school-login-email";

async function schoolForSession() {
  const session = await requireSession(["ADMIN"]);
  if (!session?.schoolId) return { error: NextResponse.json({ error: "Enter a school first" }, { status: 400 }) };
  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { id: true, slug: true, name: true },
  });
  if (!school) return { error: NextResponse.json({ error: "School not found" }, { status: 404 }) };
  return { school };
}

export async function GET() {
  const loaded = await schoolForSession();
  if ("error" in loaded && loaded.error) return loaded.error;
  const school = loaded.school!;
  const policy = loginPolicyForSlug(school.slug);
  const exceptions = await prisma.schoolLoginEmailException.findMany({
    where: { schoolId: school.id },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { id: true, email: true, role: true, note: true },
  });
  return NextResponse.json({
    schoolName: school.name,
    studentDomains: policy?.studentDomains ?? [],
    facultyDomains: policy?.facultyDomains ?? [],
    exceptions,
  });
}

export async function POST(request: Request) {
  const loaded = await schoolForSession();
  if ("error" in loaded && loaded.error) return loaded.error;
  const school = loaded.school!;
  const body = await request.json().catch(() => ({}));
  const email = normalizeLoginEmail(String(body.email ?? ""));
  const role = String(body.role ?? "").toUpperCase();
  const note = String(body.note ?? "").trim() || null;
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a full email address." }, { status: 400 });
  }
  if (role !== "STUDENT" && role !== "FACULTY") {
    return NextResponse.json({ error: "Choose student or faculty." }, { status: 400 });
  }
  const row = await prisma.schoolLoginEmailException.upsert({
    where: { schoolId_email: { schoolId: school.id, email } },
    create: { schoolId: school.id, email, role, note },
    update: { role, note },
    select: { id: true, email: true, role: true, note: true },
  });
  return NextResponse.json({ ok: true, exception: row });
}

export async function DELETE(request: Request) {
  const loaded = await schoolForSession();
  if ("error" in loaded && loaded.error) return loaded.error;
  const school = loaded.school!;
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing exception." }, { status: 400 });
  await prisma.schoolLoginEmailException.deleteMany({
    where: { id, schoolId: school.id },
  });
  return NextResponse.json({ ok: true });
}
