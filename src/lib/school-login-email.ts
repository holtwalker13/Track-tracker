import { prisma } from "@/lib/db";
import { TENANTS, tenantBySlug, type TenantSlug } from "@/lib/tenants";

export type LoginAudience = "student" | "faculty";

export type SchoolLoginPolicy = {
  studentDomains: string[];
  facultyDomains: string[];
};

export function loginPolicyForSlug(slug: string | null | undefined): SchoolLoginPolicy | null {
  const tenant = tenantBySlug(slug);
  if (!tenant?.studentLoginDomains?.length && !tenant?.facultyLoginDomains?.length) return null;
  return {
    studentDomains: tenant.studentLoginDomains ?? [],
    facultyDomains: tenant.facultyLoginDomains ?? [],
  };
}

export function domainsForAudience(policy: SchoolLoginPolicy, audience: LoginAudience): string[] {
  return audience === "faculty" ? policy.facultyDomains : policy.studentDomains;
}

/** Seeded demo mailboxes stay on the old sandbox domain and are not asked to switch. */
export function isSeedDemoLogin(email: string): boolean {
  return /^(coach|student)\d+@(jhs\.demo|demo\.local|chs\.demo|capehigh\.placeholder)$/i.test(
    normalizeLoginEmail(email)
  );
}

export function emailMatchesDomains(email: string, domains: string[]): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  return domains.some((d) => d.toLowerCase() === domain);
}

export function schoolEmailHint(policy: SchoolLoginPolicy, audience: LoginAudience): string {
  const domains = domainsForAudience(policy, audience);
  const list = domains.map((d) => `@${d}`).join(" or ");
  if (audience === "faculty") return `Faculty sign in with a ${list} email.`;
  return `Students sign in with a ${list} email.`;
}

/** Address already stored on this student's roster, including a test address outside the school domain. */
export function emailMatchesRoster(email: string, rosterEmail: string | null | undefined): boolean {
  if (!rosterEmail?.includes("@")) return false;
  return normalizeLoginEmail(email) === normalizeLoginEmail(rosterEmail);
}

export function emailAllowedByPolicy(input: {
  email: string;
  audience: LoginAudience;
  policy: SchoolLoginPolicy | null;
  exceptions?: { email: string; role: string }[];
}): boolean {
  const email = normalizeLoginEmail(input.email);
  if (!email.includes("@")) return false;
  if (isSeedDemoLogin(email)) return true;
  if (!input.policy) return true;
  const domains = domainsForAudience(input.policy, input.audience);
  if (emailMatchesDomains(email, domains)) return true;
  const role = input.audience === "faculty" ? "FACULTY" : "STUDENT";
  return (input.exceptions ?? []).some(
    (row) => row.email.toLowerCase() === email && row.role === role
  );
}

export function normalizeLoginEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function emailDomain(email: string): string | null {
  const normalized = normalizeLoginEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return null;
  return normalized.slice(at + 1);
}

/** Map a login email domain to a tenant school slug (placeholder + legacy sandbox domains). */
export function resolveSchoolSlugFromEmailDomain(email: string): TenantSlug | null {
  const domain = emailDomain(email);
  if (!domain) return null;
  for (const tenant of TENANTS) {
    if (tenant.loginEmailDomains.some((d) => d.toLowerCase() === domain)) {
      return tenant.slug;
    }
  }
  return null;
}

export async function resolveSchoolIdFromLoginEmail(email: string): Promise<string | null> {
  const slug = resolveSchoolSlugFromEmailDomain(email);
  if (!slug) return null;
  const school = await prisma.school.findFirst({
    where: { slug },
    select: { id: true },
  });
  return school?.id ?? null;
}

/** Roster email match scoped to a school when domain resolution finds one; otherwise global. */
export async function findStudentProfileByRosterEmail(
  email: string,
  opts?: { schoolId?: string | null }
): Promise<{
  id: string;
  schoolId: string;
  userId: string | null;
} | null> {
  const rosterEmail = normalizeLoginEmail(email);
  if (!rosterEmail.includes("@")) return null;

  const profile = await prisma.studentProfile.findFirst({
    where: {
      rosterEmail,
      ...(opts?.schoolId ? { schoolId: opts.schoolId } : {}),
    },
    select: { id: true, schoolId: true, userId: true },
  });
  return profile;
}
