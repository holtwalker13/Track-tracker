export const DEMO_PASSWORD = "rekcart";

export type TenantSlug = "demo" | "jhs" | "chs";

export type TenantConfig = {
  slug: TenantSlug;
  name: string;
  shortName: string;
  description: string;
  coachEmail: string;
  studentEmail: string | null;
  emptyRoster: boolean;
};

export const TENANTS: TenantConfig[] = [
  {
    slug: "demo",
    name: "General Demo",
    shortName: "Demo",
    description: "Anonymous sample roster with the full testing history. Safe to click around.",
    coachEmail: "coach1@demo.local",
    studentEmail: "student1@demo.local",
    emptyRoster: false,
  },
  {
    slug: "jhs",
    name: "Jackson High School",
    shortName: "JHS",
    description: "Live school with weightlifting periods. Demo student: Kendall Leland.",
    coachEmail: "coach1@jhs.demo",
    studentEmail: "student1@jhs.demo",
    emptyRoster: false,
  },
  {
    slug: "chs",
    name: "Central High School",
    shortName: "CHS",
    description: "Separate school system with its own coaches, students, and test marks.",
    coachEmail: "coach1@chs.demo",
    studentEmail: "student1@chs.demo",
    emptyRoster: false,
  },
];

export const ADMIN_LOGIN = {
  email: "admin@track-tracker.demo",
  password: DEMO_PASSWORD,
  name: "App Admin",
};

export function tenantBySlug(slug: string | null | undefined): TenantConfig | undefined {
  return TENANTS.find((t) => t.slug === slug);
}
