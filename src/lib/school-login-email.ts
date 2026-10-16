import { prisma } from "@/lib/db";
import { TENANTS, type TenantSlug } from "@/lib/tenants";

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
