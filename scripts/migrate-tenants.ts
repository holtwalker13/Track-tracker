/**
 * Railway keeps existing Postgres across deploys. The login tiles point at
 * coach1@jhs.demo, which on older databases is still the real JHS roster.
 *
 * This runs on every boot: anonymize remaining real names, move that populated
 * school to Demo, and ensure empty JHS + CHS + app admin exist.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ALL_KPI_BANDS, KPI_METRIC_META } from "../src/lib/kpi-targets";
import { DEFAULT_AGE_BRACKET } from "../src/lib/age-brackets";
import { ADMIN_LOGIN, DEMO_PASSWORD, TENANTS } from "../src/lib/tenants";
import { isSyntheticName, syntheticName } from "../src/lib/synthetic-names";

const prisma = new PrismaClient();

const SCHOOL_YEAR = {
  label: "2025–2026",
  startDate: new Date("2025-08-12"),
  endDate: new Date("2026-06-05"),
};

async function anonymizeSchool(schoolId: string): Promise<number> {
  const students = await prisma.studentProfile.findMany({
    where: { schoolId },
    orderBy: [{ gender: "asc" }, { createdAt: "asc" }, { studentNumber: "asc" }],
    select: { id: true, userId: true, firstName: true, lastName: true, gender: true },
  });
  if (students.length === 0) return 0;
  const dirty = students.filter((s) => !isSyntheticName(s.firstName, s.lastName, s.gender));
  if (dirty.length === 0) return 0;

  let femaleIdx = 0;
  let maleIdx = 0;
  let updated = 0;
  for (const student of students) {
    const gender = student.gender === "M" ? "M" : "F";
    const index = gender === "M" ? maleIdx++ : femaleIdx++;
    const { firstName, lastName } = syntheticName(gender, index);
    if (student.firstName === firstName && student.lastName === lastName) continue;
    await prisma.studentProfile.update({
      where: { id: student.id },
      data: { firstName, lastName },
    });
    if (student.userId) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { firstName, lastName },
      });
    }
    updated += 1;
  }
  return updated;
}

async function retargetEmails(schoolId: string, fromDomain: string, toDomain: string) {
  const coaches = await prisma.coachProfile.findMany({
    where: { schoolId },
    include: { user: true },
  });
  const students = await prisma.studentProfile.findMany({
    where: { schoolId, userId: { not: null } },
    include: { user: true },
  });
  for (const row of [...coaches, ...students]) {
    const user = row.user;
    if (!user?.email.endsWith(`@${fromDomain}`)) continue;
    const next = `${user.email.split("@")[0]}@${toDomain}`;
    const clash = await prisma.user.findUnique({ where: { email: next } });
    if (clash) continue;
    await prisma.user.update({ where: { id: user.id }, data: { email: next } });
  }
}

async function ensureKpiTargets(schoolId: string) {
  const count = await prisma.schoolKpiTarget.count({ where: { schoolId } });
  if (count > 0) return;
  await prisma.schoolKpiTarget.createMany({
    data: ALL_KPI_BANDS.flatMap((band) =>
      KPI_METRIC_META.map((meta) => ({
        schoolId,
        gender: band.gender,
        medal: band.medal,
        metricSlug: meta.slug,
        target: band.targets[meta.slug],
        ageBracket: DEFAULT_AGE_BRACKET,
      }))
    ),
  });
}

async function ensureSchoolYear(schoolId: string) {
  const current = await prisma.schoolYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (current) return current;
  return prisma.schoolYear.create({
    data: { schoolId, ...SCHOOL_YEAR, isCurrent: true },
  });
}

async function ensureCoaches(schoolId: string, emailDomain: string, hash: string) {
  const firstNames = ["Morgan", "Taylor", "Jordan", "Casey"];
  for (const [i, first] of firstNames.entries()) {
    const email = `coach${i + 1}@${emailDomain}`;
    let user = await prisma.user.findUnique({
      where: { email },
      include: { coachProfile: true },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          role: "COACH",
          firstName: first,
          lastName: "Coach",
          coachProfile: { create: { schoolId } },
        },
        include: { coachProfile: true },
      });
      continue;
    }
    if (!user.coachProfile) {
      await prisma.coachProfile.create({ data: { userId: user.id, schoolId } });
    } else if (user.coachProfile.schoolId !== schoolId) {
      console.log(`Skip ${email}: already attached to another school`);
    }
  }
}

async function ensureWeightClasses(schoolId: string) {
  const existing = await prisma.class.count({
    where: { schoolId, name: { contains: "Weights" } },
  });
  if (existing > 0) return;
  const coach = await prisma.coachProfile.findFirst({ where: { schoolId } });
  for (const n of [1, 2, 3, 4]) {
    await prisma.class.create({
      data: {
        schoolId,
        coachId: coach?.id,
        name: `Period ${n} Weights`,
        period: `Period ${n}`,
      },
    });
  }
}

async function ensureEmptySchool(opts: {
  slug: "jhs" | "chs";
  name: string;
  orgId: string;
  emailDomain: string;
  hash: string;
}) {
  let school = await prisma.school.findUnique({ where: { slug: opts.slug } });
  if (!school) {
    const district = await prisma.district.create({
      data: { organizationId: opts.orgId, name: `${opts.slug.toUpperCase()} District`, region: "Local" },
    });
    school = await prisma.school.create({
      data: {
        organizationId: opts.orgId,
        districtId: district.id,
        name: opts.name,
        slug: opts.slug,
      },
    });
    console.log(`Created ${opts.slug} school: ${opts.name}`);
  }
  await ensureKpiTargets(school.id);
  await ensureSchoolYear(school.id);
  await ensureCoaches(school.id, opts.emailDomain, opts.hash);
  if (opts.slug === "jhs") await ensureWeightClasses(school.id);
  return school;
}

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const schools = await prisma.school.findMany({
    include: { _count: { select: { studentProfiles: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (schools.length === 0) {
    console.log("No schools yet; skip tenant migrate (seed will create them).");
    return;
  }

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.log("No organization; skip tenant migrate.");
    return;
  }

  for (const school of schools) {
    const n = await anonymizeSchool(school.id);
    if (n > 0) {
      console.log(`Anonymized ${n} student name(s) at ${school.name}.`);
    }
  }

  const populated = [...schools].sort(
    (a, b) => b._count.studentProfiles - a._count.studentProfiles
  )[0]!;

  if (populated._count.studentProfiles > 20 && populated.slug !== "demo") {
    const existingDemo = await prisma.school.findFirst({ where: { slug: "demo" } });
    if (!existingDemo) {
      await prisma.school.update({
        where: { id: populated.id },
        data: { slug: "demo", name: "Demo High School" },
      });
      await retargetEmails(populated.id, "jhs.demo", "demo.local");
      await retargetEmails(populated.id, "riverside.demo", "demo.local");
      console.log(`Moved populated roster from "${populated.name}" to Demo High School (demo).`);
    } else {
      await retargetEmails(populated.id, "jhs.demo", "demo.local");
    }
  } else if (populated.slug === "demo" || populated._count.studentProfiles > 20) {
    await retargetEmails(populated.id, "jhs.demo", "demo.local");
  }

  const jhsTenant = TENANTS.find((t) => t.slug === "jhs")!;
  const chsTenant = TENANTS.find((t) => t.slug === "chs")!;
  await ensureEmptySchool({
    slug: "jhs",
    name: jhsTenant.name,
    orgId: org.id,
    emailDomain: "jhs.demo",
    hash,
  });
  await ensureEmptySchool({
    slug: "chs",
    name: chsTenant.name,
    orgId: org.id,
    emailDomain: "chs.demo",
    hash,
  });

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_LOGIN.email } });
  if (!admin) {
    await prisma.user.create({
      data: {
        email: ADMIN_LOGIN.email,
        passwordHash: hash,
        role: "ADMIN",
        firstName: "App",
        lastName: "Admin",
      },
    });
    console.log(`Created app admin ${ADMIN_LOGIN.email}`);
  }

  const jhs = await prisma.school.findUnique({
    where: { slug: "jhs" },
    include: { _count: { select: { studentProfiles: true } } },
  });
  if (jhs && jhs._count.studentProfiles > 0 && jhs.id !== populated.id) {
    console.log(`JHS has ${jhs._count.studentProfiles} student(s) (live roster).`);
  } else if (jhs) {
    console.log("JHS is empty and ready for a spreadsheet upload.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
