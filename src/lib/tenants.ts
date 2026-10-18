export const DEMO_PASSWORD = "rekcart";

/** Quick student login for General Demo (login form: demo / demo1234). */
export const DEMO_CLASS_LOGIN = {
  username: "demo",
  email: "demo@demo.local",
  password: DEMO_PASSWORD,
  studentNumber: "DEMO",
  displayName: "Demo class",
} as const;

/** General Demo roster student for class-link + Resend verification (no login until signup flow). */
export const CLASS_JOIN_LAB_DEMO = {
  username: "joinlab2028",
  studentNumber: "JOINLAB",
  firstName: "Join",
  lastName: "Lab",
  /** Override with CLASS_JOIN_DEMO_EMAIL in seed/Railway to hit a real inbox via Resend. */
  rosterEmail: "classjoin-lab@demo.local",
  className: "Fall 2025 Period 1 PE",
} as const;

export type TenantSlug = "demo" | "jhs" | "chs";

export type TenantConfig = {
  slug: TenantSlug;
  name: string;
  shortName: string;
  description: string;
  coachEmail: string;
  studentEmail: string | null;
  /** Email domains that resolve sign-ins to this school (lowercase, no @). */
  loginEmailDomains: string[];
  /** When set, student sign-in emails must use one of these domains unless an admin adds an exception. */
  studentLoginDomains?: string[];
  /** When set, coach sign-in emails must use one of these domains unless an admin adds an exception. */
  facultyLoginDomains?: string[];
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
    loginEmailDomains: ["demo.local"],
    emptyRoster: false,
  },
  {
    slug: "jhs",
    name: "Jackson High School",
    shortName: "JHS",
    description: "Live school with weightlifting periods. Demo student: Kendall Leland.",
    coachEmail: "coach1@jhs.demo",
    studentEmail: "student1@jhs.demo",
    loginEmailDomains: ["jacksonindians.us", "jackson.k12.mo.us", "jhs.demo"],
    studentLoginDomains: ["jacksonindians.us"],
    facultyLoginDomains: ["jackson.k12.mo.us"],
    emptyRoster: false,
  },
  {
    slug: "chs",
    name: "Cape High School",
    shortName: "Cape",
    description:
      "Pilot school (HS + JHS). Upload rosters in admin; coaches use school email or roster email for students.",
    coachEmail: "coach1@capehigh.placeholder",
    studentEmail: null,
    loginEmailDomains: ["capehigh.placeholder", "chs.demo"],
    emptyRoster: true,
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
