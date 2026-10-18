import { prisma } from "@/lib/db";
import { CLASS_JOIN_LAB_DEMO } from "@/lib/tenants";
import { classJoinPath } from "@/lib/services/class-join-link";

export type DemoClassJoinLabInfo = {
  joinPath: string;
  rosterEmail: string;
  username: string;
  className: string;
  schoolName: string;
};

export async function getDemoClassJoinLab(): Promise<DemoClassJoinLabInfo | null> {
  const school = await prisma.school.findFirst({
    where: { slug: "demo" },
    select: { id: true, name: true },
  });
  if (!school) return null;

  const demoClass = await prisma.class.findFirst({
    where: { schoolId: school.id, name: CLASS_JOIN_LAB_DEMO.className },
    select: { id: true, name: true },
  });
  if (!demoClass) return null;

  const profile = await prisma.studentProfile.findFirst({
    where: { schoolId: school.id, studentNumber: CLASS_JOIN_LAB_DEMO.studentNumber },
    select: { rosterEmail: true, username: true },
  });

  const rosterEmail =
    profile?.rosterEmail?.trim() ||
    (process.env.CLASS_JOIN_DEMO_EMAIL ?? CLASS_JOIN_LAB_DEMO.rosterEmail).trim().toLowerCase();

  return {
    joinPath: classJoinPath(demoClass.id),
    rosterEmail,
    username: profile?.username ?? CLASS_JOIN_LAB_DEMO.username,
    className: demoClass.name,
    schoolName: school.name,
  };
}
