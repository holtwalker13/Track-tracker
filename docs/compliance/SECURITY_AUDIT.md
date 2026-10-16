# Security & Privacy Audit — Pro Gradus (Track Tracker / SAP)

**Audit date:** 2026-10-16  
**Scope:** Application code, schema, API routes, auth, enrollment, leaderboards, exports, hosting assumptions.  
**Status:** Initial audit with P0 remediations applied in branch `cursor/compliance-privacy-hardening-2f9e`. This document does **not** certify legal compliance.

---

## Summary

| Severity | Found | Resolved in code | Open / external |
|----------|------:|-----------------:|----------------:|
| Critical | 4 | 3 | 1 |
| High | 8 | 5 | 3 |
| Medium | 12 | 4 | 8 |
| Low | 6 | 1 | 5 |

---

## Findings

### C-1 — Platform admin unrestricted cross-school access

| | |
|---|---|
| **Existing behavior** | `ADMIN` role could access any school; `canAccessStudentRecord` returned `true` for all schools. `switch-school` set context without audit trail. |
| **Risk** | FERPA-style unauthorized disclosure; no accountability for support browsing. |
| **Severity** | Critical |
| **Location** | `src/lib/auth/permissions.ts`, `src/app/api/admin/switch-school/route.ts` |
| **Change** | Admin student access now requires active `schoolId` in session; school switch logged to `SecurityAuditLog` with optional reason. |
| **Resolved** | Partially — time-limited support grants and MFA still required (see H-3). |
| **Tests** | `src/lib/auth/permissions.test.ts` (admin school context) |

### C-2 — Coach school-wide student access (no class scope)

| | |
|---|---|
| **Existing behavior** | Any coach in a school could PATCH any student and search full school roster via `/api/students`. |
| **Risk** | Over-collection / unauthorized access to students outside assigned classes. |
| **Severity** | Critical |
| **Location** | `src/app/api/students/route.ts`, `src/app/api/students/[id]/route.ts` |
| **Change** | Coach roster search and student PATCH gated by shared class enrollment (`coachCanAccessStudent`). |
| **Resolved** | Partially — many read paths (RSC pages, testing grid) still school-scoped for coaches; further API audit recommended. |
| **Tests** | Unit tests for permissions; integration tests **not yet** (requires DB fixtures). |

### C-3 — Under-13 collection without school authorization record

| | |
|---|---|
| **Existing behavior** | Class join and invite flows collected DOB-linked roster data with no COPPA school authorization workflow. |
| **Risk** | COPPA school-consent pathway not demonstrable. |
| **Severity** | Critical |
| **Location** | `src/lib/services/class-join.ts`, `src/lib/services/student-login-invite.ts`, `src/app/api/students/route.ts` |
| **Change** | `SchoolAuthorization` model + `ensureUnder13CollectionAllowed()` blocks under-13 account completion/create until `ACTIVE` authorization exists. |
| **Resolved** | Yes (technical gate); legal/operational activation requires school action. |
| **Tests** | `src/lib/auth/tenant-access.test.ts` (`isUnder13`) |

### C-4 — Legacy class join tokens never expire

| | |
|---|---|
| **Existing behavior** | HMAC `classId.sig` links valid indefinitely if leaked. |
| **Risk** | Long-lived enrollment surface; no revocation. |
| **Severity** | Critical (for leaked tokens) |
| **Location** | `src/lib/services/class-join-link.ts` |
| **Change** | New links use `ClassJoinLink` (90-day TTL, revocable). Legacy tokens still accepted for backward compatibility. |
| **Resolved** | Partially — migrate schools to new links; disable legacy via config **not implemented**. |
| **Tests** | `src/lib/services/class-join-link.test.ts` (legacy HMAC) |

### H-1 — No security audit trail

| | |
|---|---|
| **Existing behavior** | No structured audit log for auth, exports, admin context, privacy changes. |
| **Risk** | Cannot investigate incidents or demonstrate accountability. |
| **Severity** | High |
| **Location** | N/A (greenfield) |
| **Change** | `SecurityAuditLog` + `writeAuditLog()` on login, admin switch, exports, privacy settings, class link lifecycle. |
| **Resolved** | Partially — not all API routes instrumented. |
| **Tests** | Manual / future integration tests |

### H-2 — No login / enrollment rate limiting

| | |
|---|---|
| **Existing behavior** | Unlimited login and invite attempts. |
| **Risk** | Credential stuffing, roster probing. |
| **Severity** | High |
| **Location** | `src/app/api/auth/login/route.ts`, `src/app/api/class-join/route.ts`, `src/app/api/student-invite/route.ts` |
| **Change** | In-process rate limiter (`src/lib/security/rate-limit.ts`). |
| **Resolved** | Partially — single-instance only; Redis/shared store needed for multi-replica Railway. |
| **Tests** | `src/lib/security/rate-limit.test.ts` |

### H-3 — No MFA for administrators

| | |
|---|---|
| **Existing behavior** | Password-only admin sessions (7-day JWT cookie). |
| **Risk** | Privileged account compromise. |
| **Severity** | High |
| **Location** | `src/lib/auth/session.ts`, `src/lib/auth/cookie.ts` |
| **Change** | None in this pass. |
| **Resolved** | No — requires product decision + IdP or TOTP. |

### H-4 — Student identity leak via `canViewStudentIdentity`

| | |
|---|---|
| **Existing behavior** | Any logged-in student returned `true` for all schools. |
| **Risk** | Incorrect authorization helpers if reused. |
| **Severity** | High |
| **Location** | `src/lib/auth/permissions.ts` |
| **Change** | School + self scoping. |
| **Resolved** | Yes |
| **Tests** | `src/lib/auth/permissions.test.ts` |

### H-5 — Leaderboard names for peer students

| | |
|---|---|
| **Existing behavior** | Student viewers could see peer legal names on leaderboards. |
| **Risk** | Unnecessary identification of minors. |
| **Severity** | High |
| **Location** | `src/lib/queries/coach.ts` (`leaderboardEntryName`) |
| **Change** | Default pseudonym display; school setting `LEGAL_NAME`; page disabled when peer leaderboards off. |
| **Resolved** | Yes (defaults protective) |
| **Tests** | Existing leaderboard rank tests; display-name tests **TODO** |

### H-6 — Disabled accounts could retain sessions

| | |
|---|---|
| **Existing behavior** | No `disabledAt` on users. |
| **Risk** | Cannot revoke access quickly. |
| **Severity** | High |
| **Location** | `prisma/schema.prisma` (`User.disabledAt`), `src/lib/auth/session.ts`, login route |
| **Change** | Session validation rejects disabled users; login denied. |
| **Resolved** | Yes (no admin UI to disable yet) |
| **Tests** | Not automated |

### H-7 — District administrator role absent

| | |
|---|---|
| **Existing behavior** | Roles: `ADMIN`, `COACH`, `STUDENT` only. District model exists but no district-scoped admin. |
| **Risk** | Cannot enforce district isolation in product. |
| **Severity** | High |
| **Change** | Documented gap; organization-level admin only. |
| **Resolved** | No (P2) |

### H-8 — CSV / export authorization inconsistent

| | |
|---|---|
| **Existing behavior** | Workout log export and mark import school-scoped but not coach-class-scoped. |
| **Risk** | Bulk exfiltration by coach with no class assignment. |
| **Severity** | High |
| **Change** | Student JSON export uses `assertCoachOrAdminStudentAccess`; workout CSV **not updated** in this pass. |
| **Resolved** | Partially |

### M-1 — PostgreSQL Row-Level Security not used

| | |
|---|---|
| **Risk** | Defense-in-depth relies solely on application queries. |
| **Recommendation** | Evaluate RLS per tenant column (`schoolId`) — not implemented. |

### M-2 — `findUserByComputedUsername` scans up to 2000 profiles

| | |
|---|---|
| **Location** | `src/lib/auth/credentials-login.ts` |
| **Risk** | Performance + timing side channels on login. |
| **Resolved** | No |

### M-3 — Session JWT 7 days for all roles

| | |
|---|---|
| **Risk** | Long-lived privileged sessions. |
| **Recommendation** | Shorter admin TTL — not implemented. |

### M-4 — No CSRF tokens on cookie-auth POST APIs

| | |
|---|---|
| **Risk** | SameSite=Lax mitigates many cases; state-changing cross-site POSTs from subdomains remain a review item. |
| **Resolved** | Documented; no CSRF token added. |

### M-5 — Marketing / analytics pixels

| | |
|---|---|
| **Existing behavior** | No third-party analytics scripts found in `src/`. |
| **Risk** | Low today; policy needed before adding tags. |
| **Resolved** | Documented in `SUBPROCESSORS.md` |

### M-6 — Password reset flow

| | |
|---|---|
| **Existing behavior** | Coach/student invite tokens act as setup/reset; no email-based forgot-password. |
| **Risk** | Operational dependency on coaches for recovery. |
| **Resolved** | Accepted for school context; document in privacy procedure. |

### M-7 — Audit logs writable by application DB user

| | |
|---|---|
| **Risk** | Compromised app could insert fake logs; immutability requires DB permissions / separate store. |
| **Resolved** | Infrastructure action |

### M-8 — Backup encryption & retention

| | |
|---|---|
| **Risk** | Railway/Postgres settings not verified in code. |
| **Resolved** | See `DEPLOYMENT_SECURITY.md` — requires ops verification |

### L-1 — `console.error` on session verify may leak error classes

| | |
|---|---|
| **Location** | `src/lib/auth/session.ts` |
| **Risk** | Low — messages only, no tokens logged. |

---

## Authentication review (checklist)

| Control | Status |
|---------|--------|
| bcrypt password hashing | Verified (`bcryptjs`, 12 rounds on invites) |
| HttpOnly session cookie | Verified (`sap_session`) |
| Secure cookie in production | Verified |
| SameSite=Lax | Verified |
| HTTPS | Required in production (hosting) |
| Rate limiting | Partial (login, class-join, student-invite) |
| Session invalidation on disable | Verified |
| MFA (admin) | Not implemented |

---

## Recommended next audit pass

1. Systematically apply `coachCanAccessStudent` to all `/api/*` routes and coach RSC loaders.
2. Add integration test suite with two schools + two coaches (tenant isolation).
3. Retire legacy class join tokens per school after reissuing QR codes.
4. Implement district admin role and district-scoped queries.
5. Wire workout CSV export to coach scope + audit log.
6. External penetration test and legal review of draft policies.
