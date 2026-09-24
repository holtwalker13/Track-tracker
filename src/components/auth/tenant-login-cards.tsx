"use client";

import { loginAction } from "@/app/login/actions";
import { ADMIN_LOGIN, DEMO_PASSWORD, TENANTS, type TenantSlug } from "@/lib/tenants";

export function TenantLoginCards({
  studentEmailsBySlug = {},
}: {
  /** First student login email per school (from roster). */
  studentEmailsBySlug?: Partial<Record<TenantSlug, string | null>>;
}) {
  return (
    <div className="mt-8 border-t border-card-border pt-6">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        School systems
      </p>
      <p className="mt-1 mb-4 text-center text-sm text-muted">
        Each login is its own roster. Coaches and students cannot see another school.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {TENANTS.map((tenant) => {
          const studentEmail =
            studentEmailsBySlug[tenant.slug] ?? tenant.studentEmail;
          return (
          <div
            key={tenant.slug}
            className="flex flex-col rounded-xl border border-card-border bg-background/60 p-3"
          >
            <p className="text-sm font-semibold">{tenant.shortName}</p>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">{tenant.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <form action={loginAction}>
                <input type="hidden" name="email" value={tenant.coachEmail} />
                <input type="hidden" name="password" value={DEMO_PASSWORD} />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-accent py-2 text-xs font-semibold text-background"
                >
                  Coach
                </button>
              </form>
              {studentEmail ? (
                <form action={loginAction}>
                  <input type="hidden" name="email" value={studentEmail} />
                  <input type="hidden" name="password" value={DEMO_PASSWORD} />
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-card-border py-2 text-xs font-semibold hover:bg-card"
                    title={studentEmail}
                  >
                    Student
                  </button>
                </form>
              ) : (
                <p className="flex items-center justify-center text-center text-[11px] leading-tight text-muted">
                  Add a student to roster first
                </p>
              )}
            </div>
          </div>
        );
        })}
      </div>
      <form action={loginAction} className="mt-4 text-center">
        <input type="hidden" name="email" value={ADMIN_LOGIN.email} />
        <input type="hidden" name="password" value={ADMIN_LOGIN.password} />
        <button type="submit" className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline">
          App admin — add classes and students across schools
        </button>
      </form>
    </div>
  );
}
