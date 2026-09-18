import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { formatActivityValue } from "../src/lib/format";
import { ALL_KPI_BANDS, KPI_METRIC_META } from "../src/lib/kpi-targets";
import { DEFAULT_CLASS_YEAR, GRADE_LEVELS, isClassYear } from "../src/lib/grades";
import { DEFAULT_AGE_BRACKET } from "../src/lib/age-brackets";

const prisma = new PrismaClient();

const ACTIVITIES: {
  slug: string;
  name: string;
  cat: string;
  unit: string;
  dir: "HIGHER_BETTER" | "LOWER_BETTER";
  min?: number;
  max?: number;
  bw?: boolean;
}[] = [
  { slug: "flying-10-meter", name: "Flying 10 m", cat: "speed", unit: "seconds", dir: "LOWER_BETTER", min: 0.9, max: 2.5 },
  { slug: "flying-10-yard", name: "Flying 10 yd", cat: "speed", unit: "seconds", dir: "LOWER_BETTER", min: 0.9, max: 2.5 },
  { slug: "flying-20-meter", name: "Flying 20 m", cat: "speed", unit: "seconds", dir: "LOWER_BETTER", min: 1.8, max: 4.5 },
  { slug: "20-meter-start", name: "20 m start (blocks)", cat: "speed", unit: "seconds", dir: "LOWER_BETTER", min: 2.5, max: 5.5 },
  { slug: "40-yard-dash", name: "40-Yard Dash", cat: "speed", unit: "seconds", dir: "LOWER_BETTER", min: 4.2, max: 9 },
  { slug: "100-meter-dash", name: "Projected 100 m", cat: "speed", unit: "seconds", dir: "LOWER_BETTER", min: 10, max: 35 },
  { slug: "pro-agility", name: "Pro Agility (5-10-5)", cat: "agility", unit: "seconds", dir: "LOWER_BETTER", min: 4, max: 8 },
  { slug: "standing-broad-jump", name: "Standing Broad Jump", cat: "power", unit: "inches", dir: "HIGHER_BETTER", min: 40, max: 140 },
  { slug: "vertical-jump", name: "Vertical Jump (CMJ)", cat: "power", unit: "inches", dir: "HIGHER_BETTER", min: 8, max: 42 },
  { slug: "squat", name: "Back Squat 1RM", cat: "strength", unit: "lb", dir: "HIGHER_BETTER", min: 45, max: 550, bw: true },
  { slug: "squat-relative", name: "Back Squat 1RM / BW", cat: "strength", unit: "x BW", dir: "HIGHER_BETTER", min: 0.4, max: 3.2, bw: true },
  { slug: "hang-clean", name: "Hang Clean 1RM", cat: "strength", unit: "lb", dir: "HIGHER_BETTER", min: 45, max: 400, bw: true },
  { slug: "hang-clean-relative", name: "Hang Clean 1RM / BW", cat: "strength", unit: "x BW", dir: "HIGHER_BETTER", min: 0.3, max: 2.2, bw: true },
  { slug: "bench-press", name: "Bench Press 1RM", cat: "strength", unit: "lb", dir: "HIGHER_BETTER", min: 45, max: 400, bw: true },
  { slug: "sit-and-reach", name: "V-Sit and Reach", cat: "flexibility", unit: "inches", dir: "HIGHER_BETTER", min: 0, max: 30 },
  { slug: "pull-ups", name: "Pull-Ups", cat: "strength", unit: "reps", dir: "HIGHER_BETTER", min: 0, max: 50 },
  { slug: "weight", name: "Body Weight", cat: "body", unit: "lb", dir: "HIGHER_BETTER", min: 70, max: 320 },
];

const CATEGORIES = [
  { slug: "speed", name: "Speed" },
  { slug: "agility", name: "Agility" },
  { slug: "power", name: "Explosive Power" },
  { slug: "strength", name: "Strength" },
  { slug: "flexibility", name: "Flexibility" },
  { slug: "body", name: "Body Metrics" },
];

const MALE_FIRST = [
  "Aiden", "Bennett", "Caleb", "Drew", "Eli", "Finn", "Grant", "Hunter", "Isaac", "Jonah",
  "Kaden", "Landon", "Mason", "Nolan", "Owen", "Parker", "Quinn", "Ryder", "Silas", "Tucker",
  "Wesley", "Xander", "Yale", "Zane", "Brady", "Colton", "Declan", "Emmett", "Felix", "Graham",
  "Holden", "Jasper", "Knox", "Luca", "Miles", "Nash", "Oscar", "Pierce", "Roman", "Theo",
];
const MALE_LAST = [
  "Adler", "Brooks", "Carson", "Dalton", "Ellis", "Foster", "Griffin", "Hayes", "Ingram", "Jensen",
  "Keller", "Lawson", "Madden", "Norris", "Palmer", "Reeves", "Sutton", "Trent", "Vaughn", "Walker",
  "Barrett", "Collins", "Dunn", "Everett", "Farley", "Gibson", "Hale", "Iverson", "Keene", "Lang",
];

const MALE_SPORTS: Record<string, string> = {
  volleyball: "football",
  soccer: "football",
  basketball: "basketball",
  track: "track",
  "pe / weights": "pe / weights",
  "pe / weights, soccer": "football",
};

type AthleteRow = {
  firstName: string;
  lastName: string;
  classYear: number;
  gender: "F" | "M";
  bodyWeight: number | null;
  sports: string | null;
  comments: string | null;
  marks: Record<string, number>;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") {
      cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function parseNum(raw?: string): number | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseClassYear(raw?: string): number {
  const n = parseInt((raw ?? "").trim(), 10);
  if (n === 2038) return 2028;
  if (isClassYear(n)) return n;
  return DEFAULT_CLASS_YEAR;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "Athlete" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function displayFor(slug: string, unit: string, value: number): string {
  return formatActivityValue(value, unit, slug);
}

function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function mapMaleSports(sports: string | null): string | null {
  if (!sports) return "football";
  const key = sports.toLowerCase();
  if (MALE_SPORTS[key]) return MALE_SPORTS[key]!;
  if (key.includes("track")) return "track";
  if (key.includes("basketball")) return "basketball";
  if (key.includes("football")) return "football";
  if (key.includes("soccer")) return "soccer";
  if (key.includes("weights") || key.includes("pe")) return "pe / weights";
  return "football";
}

function scaleMaleMark(slug: string, value: number): number {
  switch (slug) {
    case "flying-10-meter":
    case "flying-10-yard":
    case "flying-20-meter":
    case "20-meter-start":
      return roundTo(value * 0.91, 3);
    case "40-yard-dash":
    case "100-meter-dash":
    case "pro-agility":
      return roundTo(value * 0.91, 2);
    case "standing-broad-jump":
      return roundTo(value * 1.18, 0);
    case "vertical-jump":
      return roundTo(value * 1.22, 1);
    case "squat":
    case "hang-clean":
    case "bench-press":
      return roundTo(value * 1.45, 0);
    case "weight":
      return roundTo(value * 1.27, 0);
    default:
      return value;
  }
}

function loadFemaleAthletes(): AthleteRow[] {
  const csvPath = path.join(__dirname, "data", "jhs-female-athletes.csv");
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const headerIdx = rows.findIndex((r) => r[0]?.trim().toLowerCase() === "name");
  if (headerIdx < 0) throw new Error("CSV header row with Name not found");
  const header = rows[headerIdx]!.map((h) => h.trim());
  const col = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const idx = {
    name: col("Name"),
    classYear: col("Class"),
    bw: col("Body Weight"),
    broadIn: col("Broad (inches)"),
    vertical: col("Vertical"),
    proAgility: col("Pro Agility"),
    squat: col("Squat 1rm"),
    clean: col("Clean 1rm"),
    bench: col("Bench 1rm"),
    fly10yd: header.findIndex((h) => h.toLowerCase().startsWith("flying 10yd")),
    fly10m: header.findIndex((h) => h.toLowerCase().startsWith("flying 10m")),
    proj100: header.findIndex((h) => h.toLowerCase().startsWith("projected 100")),
    fly20m: header.findIndex((h) => h.toLowerCase().startsWith("flying 20m")),
    accel20: header.findIndex((h) => h.toLowerCase().startsWith("20m acceleration")),
    forty: col("40 Yard Dash"),
    sports: col("Sports"),
    comments: col("Comments"),
  };

  const athletes: AthleteRow[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const name = (row[idx.name] ?? "").trim();
    if (!name || name.toLowerCase() === "name") continue;
    const { firstName, lastName } = splitName(name.replace("?", "").trim());
    const bodyWeight = parseNum(row[idx.bw]);
    const marks: Record<string, number> = {};
    const add = (slug: string, raw?: string) => {
      const n = parseNum(raw);
      if (n != null) marks[slug] = n;
    };
    add("standing-broad-jump", row[idx.broadIn]);
    add("vertical-jump", row[idx.vertical]);
    add("pro-agility", row[idx.proAgility]);
    add("squat", row[idx.squat]);
    add("hang-clean", row[idx.clean]);
    add("bench-press", row[idx.bench]);
    add("flying-10-yard", row[idx.fly10yd]);
    add("flying-10-meter", row[idx.fly10m]);
    add("100-meter-dash", row[idx.proj100]);
    add("flying-20-meter", row[idx.fly20m]);
    add("20-meter-start", row[idx.accel20]);
    add("40-yard-dash", row[idx.forty]);
    if (bodyWeight != null) marks.weight = bodyWeight;
    if (marks.squat != null && bodyWeight) {
      marks["squat-relative"] = roundTo(marks.squat / bodyWeight, 2);
    }
    if (marks["hang-clean"] != null && bodyWeight) {
      marks["hang-clean-relative"] = roundTo(marks["hang-clean"] / bodyWeight, 2);
    }

    athletes.push({
      firstName,
      lastName: lastName || "Athlete",
      classYear: parseClassYear(row[idx.classYear]),
      gender: "F",
      bodyWeight,
      sports: (row[idx.sports] ?? "").trim() || null,
      comments: (row[idx.comments] ?? "").trim() || null,
      marks,
    });
  }
  return athletes;
}

function makeMaleAthletes(females: AthleteRow[]): AthleteRow[] {
  return females.map((f, i) => {
    const firstName = MALE_FIRST[i % MALE_FIRST.length]!;
    const lastName = MALE_LAST[Math.floor(i / MALE_FIRST.length) % MALE_LAST.length]!;
    const marks: Record<string, number> = {};
    for (const [slug, value] of Object.entries(f.marks)) {
      if (slug.endsWith("-relative")) continue;
      marks[slug] = scaleMaleMark(slug, value);
    }
    const bw = marks.weight ?? (f.bodyWeight != null ? scaleMaleMark("weight", f.bodyWeight) : null);
    if (bw != null) marks.weight = bw;
    if (marks.squat != null && bw) marks["squat-relative"] = roundTo(marks.squat / bw, 2);
    if (marks["hang-clean"] != null && bw) {
      marks["hang-clean-relative"] = roundTo(marks["hang-clean"] / bw, 2);
    }
    return {
      firstName,
      lastName,
      classYear: f.classYear,
      gender: "M" as const,
      bodyWeight: bw,
      sports: mapMaleSports(f.sports),
      comments: null,
      marks,
    };
  });
}

async function main() {
  const DEMO_PASSWORD = "rekcart";
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.FORCE_SEED !== "1") {
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await prisma.user.updateMany({ data: { passwordHash: hash } });
    console.log(
      `Skipping full seed (${existingUsers} users). Demo passwords updated to "${DEMO_PASSWORD}". Set FORCE_SEED=1 to wipe and reload.`
    );
    return;
  }
  if (existingUsers > 0) {
    console.log("FORCE_SEED=1: wiping database and reloading JHS roster...");
  }

  await prisma.schoolKpiTarget.deleteMany();
  await prisma.performanceResult.deleteMany();
  await prisma.studentAchievement.deleteMany();
  await prisma.testingSessionStudent.deleteMany();
  await prisma.testingSessionActivity.deleteMany();
  await prisma.testingSession.deleteMany();
  await prisma.classEnrollment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.studentEnrollment.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.coachProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.benchmarkValue.deleteMany();
  await prisma.benchmarkDataset.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.activityCategory.deleteMany();
  await prisma.schoolYear.deleteMany();
  await prisma.school.deleteMany();
  await prisma.district.deleteMany();
  await prisma.organizationSettings.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.achievement.deleteMany();

  const hash = await bcrypt.hash("rekcart", 10);

  const org = await prisma.organization.create({
    data: {
      name: "JHS Athletics",
      slug: "jhs-athletics",
      benchmarkSharingEnabled: true,
      settings: { create: {} },
    },
  });

  const district = await prisma.district.create({
    data: { organizationId: org.id, name: "JHS District", region: "Local" },
  });

  const school = await prisma.school.create({
    data: {
      organizationId: org.id,
      districtId: district.id,
      name: "Jackson High School",
    },
  });

  await prisma.schoolKpiTarget.createMany({
    data: ALL_KPI_BANDS.flatMap((band) =>
      KPI_METRIC_META.map((meta) => ({
        schoolId: school.id,
        gender: band.gender,
        medal: band.medal,
        metricSlug: meta.slug,
        target: band.targets[meta.slug],
        ageBracket: DEFAULT_AGE_BRACKET,
      }))
    ),
  });

  const schoolYear = await prisma.schoolYear.create({
    data: {
      schoolId: school.id,
      label: "2025–2026",
      startDate: new Date("2025-08-12"),
      endDate: new Date("2026-06-05"),
      isCurrent: true,
    },
  });

  for (const c of CATEGORIES) {
    await prisma.activityCategory.create({
      data: { slug: c.slug, name: c.name, sortOrder: CATEGORIES.indexOf(c) },
    });
  }
  const cats = await prisma.activityCategory.findMany();
  const catMap = new Map(cats.map((c) => [c.slug, c.id]));

  const activityRecords = await Promise.all(
    ACTIVITIES.map((a) =>
      prisma.activity.create({
        data: {
          slug: a.slug,
          name: a.name,
          categoryId: catMap.get(a.cat)!,
          unit: a.unit,
          scoringDirection: a.dir,
          minRealistic: a.min,
          maxRealistic: a.max,
          bodyweightInfluenced: a.bw ?? false,
          genderInfluenced: true,
        },
      })
    )
  );
  const actBySlug = new Map(activityRecords.map((a) => [a.slug, a]));

  for (const band of ALL_KPI_BANDS) {
    const dataset = await prisma.benchmarkDataset.create({
      data: {
        name: band.label,
        sourceName:
          band.gender === "F"
            ? "JHS Athletics KPI Database — Female"
            : "Synthetic male analog of the JHS female KPI key",
        datasetYear: 2026,
        population: band.gender === "F" ? "FEMALE" : "MALE",
        geographicRegion: "JHS",
        methodologyNotes:
          band.gender === "F"
            ? "JHS default Gold/Silver/Bronze KPI marks. Schools can override these on the Medal targets page."
            : "Synthetic male analog of the JHS female KPI key. Schools can override these on the Medal targets page.",
        isSynthetic: band.gender === "M",
      },
    });

    for (const meta of KPI_METRIC_META) {
      const act = actBySlug.get(meta.slug);
      if (!act) continue;
      const p50 = band.targets[meta.slug];
      const spread = meta.direction === "HIGHER_BETTER" ? p50 * 0.08 : p50 * 0.04;
      await prisma.benchmarkValue.create({
        data: {
          datasetId: dataset.id,
          activityId: act.id,
          gender: band.gender,
          p25: meta.direction === "HIGHER_BETTER" ? p50 - spread : p50 + spread,
          p50,
          p75: meta.direction === "HIGHER_BETTER" ? p50 + spread : p50 - spread,
          p90: meta.direction === "HIGHER_BETTER" ? p50 + spread * 1.6 : p50 - spread * 1.6,
        },
      });
    }
  }

  await prisma.achievement.createMany({
    data: [
      { slug: "first-test", name: "First Test Completed", description: "Recorded your first athletic test." },
      { slug: "five-tests", name: "5 Tests Completed", description: "Completed five tests." },
      { slug: "new-pr", name: "New Personal Record", description: "Set a new personal best." },
      { slug: "top-25", name: "Top 25%", description: "Ranked in the top 25% for an activity." },
      { slug: "class-leader", name: "Class Leader", description: "Led your graduating class in an activity." },
    ],
  });

  const coaches = await Promise.all(
    ["Morgan", "Taylor", "Jordan", "Casey"].map(async (first, i) => {
      const user = await prisma.user.create({
        data: {
          email: `coach${i + 1}@jhs.demo`,
          passwordHash: hash,
          role: "COACH",
          firstName: first,
          lastName: "Coach",
        },
      });
      return prisma.coachProfile.create({
        data: { userId: user.id, schoolId: school.id },
      });
    })
  );

  const classesByYear = new Map<number, string>();
  for (const year of GRADE_LEVELS) {
    const rec = await prisma.class.create({
      data: {
        schoolId: school.id,
        coachId: coaches[year % coaches.length]!.id,
        name: `Class of ${year}`,
        period: null,
        gradeLevel: year,
      },
    });
    classesByYear.set(year, rec.id);
  }

  const hourDefs = [
    { name: "1st Hour PE", period: "1st Hour" },
    { name: "2nd Hour Weights", period: "2nd Hour" },
    { name: "3rd Hour Athletics", period: "3rd Hour" },
    { name: "4th Hour Speed", period: "4th Hour" },
    { name: "Fall Semester PE", period: "Fall" },
    { name: "Spring Semester Athletics", period: "Spring" },
  ];
  const hourClasses = await Promise.all(
    hourDefs.map((def, i) =>
      prisma.class.create({
        data: {
          schoolId: school.id,
          coachId: coaches[i % coaches.length]!.id,
          name: def.name,
          period: def.period,
        },
      })
    )
  );

  const females = loadFemaleAthletes();
  const males = makeMaleAthletes(females);
  const roster = [...females, ...males];

  const testingDate = new Date("2026-04-15");
  const session = await prisma.testingSession.create({
    data: {
      schoolId: school.id,
      schoolYearId: schoolYear.id,
      name: "JHS KPI Testing 2026",
      testingDate,
      status: "COMPLETED",
    },
  });

  const testSlugs = ACTIVITIES.filter((a) => a.slug !== "weight").map((a) => a.slug);
  for (const [i, slug] of testSlugs.entries()) {
    await prisma.testingSessionActivity.create({
      data: { sessionId: session.id, activityId: actBySlug.get(slug)!.id, sortOrder: i },
    });
  }

  const coachUser = await prisma.user.findFirst({ where: { role: "COACH" } });
  let studentIndex = 0;
  let sampleFemaleEmail: string | null = null;

  for (const athlete of roster) {
    studentIndex++;
    const email = `student${studentIndex}@jhs.demo`;
    if (!sampleFemaleEmail && athlete.gender === "F") sampleFemaleEmail = email;

    const ageOffset = Math.max(0, 2031 - athlete.classYear);
    const dob = new Date(2008 + (2031 - athlete.classYear), (studentIndex * 3) % 12, 10 + (studentIndex % 18));

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        role: "STUDENT",
        firstName: athlete.firstName,
        lastName: athlete.lastName,
      },
    });

    const isAthlete = Boolean(athlete.sports && athlete.sports.trim() && !/^pe\b/i.test(athlete.sports));
    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        studentNumber: `${athlete.gender}${String(studentIndex).padStart(4, "0")}`,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        dateOfBirth: dob,
        gender: athlete.gender,
        sports: athlete.sports,
        participationType: isAthlete ? "ATHLETE" : studentIndex % 5 === 0 ? "PE" : athlete.sports ? "ATHLETE" : "PE",
        notes: athlete.comments,
        anonymousId: String(2000 + studentIndex),
      },
    });

    await prisma.studentEnrollment.create({
      data: {
        studentId: profile.id,
        schoolYearId: schoolYear.id,
        gradeLevel: athlete.classYear,
      },
    });

    const classId = classesByYear.get(athlete.classYear);
    if (classId) {
      await prisma.classEnrollment.create({
        data: { classId, studentId: profile.id },
      });
    }

    const hourClass = hourClasses[studentIndex % hourClasses.length]!;
    await prisma.classEnrollment.create({
      data: { classId: hourClass.id, studentId: profile.id },
    });

    const hasMarks = Object.keys(athlete.marks).length > 0;
    if (hasMarks) {
      await prisma.testingSessionStudent.create({
        data: { sessionId: session.id, studentId: profile.id },
      });
    }

    const ageAtTest = 14 + (12 - Math.min(12, 6 + ageOffset)) + ((studentIndex % 8) - 4) * 0.1;
    const historyDates = [
      new Date("2025-09-01"),
      new Date("2025-12-04"),
      new Date("2026-03-01"),
    ];
    const dirBySlug = new Map(ACTIVITIES.map((a) => [a.slug, a.dir]));

    for (const [slug, value] of Object.entries(athlete.marks)) {
      const act = actBySlug.get(slug);
      if (!act) continue;
      const dir = dirBySlug.get(slug) ?? "HIGHER_BETTER";

      for (const [hi, histDate] of historyDates.entries()) {
        // Older tests are worse: times slower, jumps/lifts shorter/lighter.
        const stepsBack = historyDates.length - hi;
        const histValue =
          dir === "LOWER_BETTER"
            ? Number((value * (1 + stepsBack * 0.035)).toFixed(3))
            : Number((value * (1 - stepsBack * 0.035)).toFixed(2));
        await prisma.performanceResult.create({
          data: {
            studentId: profile.id,
            activityId: act.id,
            schoolId: school.id,
            schoolYearId: schoolYear.id,
            organizationId: org.id,
            gradeLevel: athlete.classYear,
            resultValue: histValue,
            displayValue: displayFor(slug, act.unit, histValue),
            attemptNumber: 1,
            isBestAttempt: true,
            isPersonalRecord: false,
            testingDate: histDate,
            ageAtTest: ageAtTest - (stepsBack * 0.15),
            weightAtTest: athlete.bodyWeight,
            enteredById: coachUser?.id,
            entryMethod: "IMPORT",
            status: "COMPLETED",
            notes: "Prior season / mid-year check",
          },
        });
      }

      await prisma.performanceResult.create({
        data: {
          studentId: profile.id,
          activityId: act.id,
          schoolId: school.id,
          schoolYearId: schoolYear.id,
          organizationId: org.id,
          gradeLevel: athlete.classYear,
          resultValue: value,
          displayValue: displayFor(slug, act.unit, value),
          attemptNumber: 1,
          isBestAttempt: true,
          isPersonalRecord: true,
          testingDate,
          ageAtTest,
          weightAtTest: athlete.bodyWeight,
          enteredById: coachUser?.id,
          entryMethod: "IMPORT",
          status: "COMPLETED",
          testingSessionId: session.id,
          notes: slug === "100-meter-dash" ? "Projected 100m from flying speed" : athlete.comments,
          relativeStrength:
            slug === "squat" || slug === "hang-clean"
              ? athlete.marks[`${slug === "squat" ? "squat" : "hang-clean"}-relative`] ?? null
              : slug.endsWith("-relative")
                ? value
                : null,
        },
      });
    }
  }

  const extraClasses = await Promise.all([
    prisma.class.create({
      data: {
        schoolId: school.id,
        coachId: coaches[0]!.id,
        name: "Varsity Weights",
        period: "Period 2",
      },
    }),
    prisma.class.create({
      data: {
        schoolId: school.id,
        coachId: coaches[1]!.id,
        name: "Speed Development",
        period: "Period 4",
      },
    }),
  ]);
  const allProfiles = await prisma.studentProfile.findMany({
    where: { schoolId: school.id },
    select: { id: true },
    orderBy: { lastName: "asc" },
  });
  await prisma.classEnrollment.createMany({
    data: [
      ...allProfiles.slice(0, 80).map((p) => ({ classId: extraClasses[0]!.id, studentId: p.id })),
      ...allProfiles.slice(40, 120).map((p) => ({ classId: extraClasses[1]!.id, studentId: p.id })),
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete.");
  console.log("School:", school.name);
  console.log("Female athletes:", females.length);
  console.log("Male athletes (synthetic, same structure):", males.length);
  console.log("Coach login: coach1@jhs.demo / rekcart");
  console.log("Sample student:", sampleFemaleEmail, "/ rekcart");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
