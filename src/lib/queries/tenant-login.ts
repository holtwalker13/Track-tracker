import { prisma } from "@/lib/db";
import { TENANTS, type TenantSlug } from "@/lib/tenants";
import { firstStudentLoginEmailForSchool } from "@/lib/services/student-login";

export type TenantLoginInfo = {
  slug: TenantSlug;
  studentEmail: string | null;
};

/** Demo login card: first student account per school (creates logins for imported roster rows). */
export async function getTenantLoginInfo(): Promise<TenantLoginInfo[]> {
  const schools = await prisma.school.findMany({
    where: { slug: { in: TENANTS.map((t) => t.slug) } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(schools.map((s) => [s.slug, s.id]));

  return Promise.all(
    TENANTS.map(async (tenant) => {
      const schoolId = bySlug.get(tenant.slug);
      if (!schoolId) {
        return { slug: tenant.slug, studentEmail: tenant.studentEmail };
      }
      const dynamic = await firstStudentLoginEmailForSchool(schoolId, tenant.slug);
      return {
        slug: tenant.slug,
        studentEmail: dynamic ?? tenant.studentEmail,
      };
    })
  );
}
