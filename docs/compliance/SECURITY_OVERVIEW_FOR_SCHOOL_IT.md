# Security Overview for School IT Departments (Draft)

**DRAFT — technical summary for security review meetings.**

## Architecture

- Next.js 15 application on Railway
- PostgreSQL database (tenant isolation via `schoolId` on records)
- Cookie-based JWT sessions (`sap_session`, HttpOnly, Secure in production)

## Access control

| Role | Scope |
|------|--------|
| Student | Own profile and results; peer leaderboards per school privacy settings |
| Coach | Students in shared classes (API enforcement expanding) |
| School admin (coach + privacy UI) | School-scoped privacy settings, audit view, export requests |
| Platform admin | Requires explicit school context; actions audited |

## Encryption

- TLS in transit (HTTPS to app; TLS to database — verify in deployment)
- At rest: depends on hosting provider — verify with Railway/DB vendor

## Enrollment security

- Class links: cryptographically random tokens with expiry/revocation (legacy signed links being phased out)
- Student invites: hashed tokens, expiry, name confirmation
- Rate limits on login and enrollment endpoints

## Compliance artifacts

- `DATA_INVENTORY.md`, `SUBPROCESSORS.md`, `SECURITY_AUDIT.md`
- Privacy admin UI: **School → Privacy** in coach hub

## Not included in this release

- MFA for administrators
- District administrator role
- SSO/SAML (feasible future work)
- PostgreSQL Row-Level Security

## Questions for IT review

1. Is an executed DPA on file?
2. Is under-13 authorization recorded before collecting DOB for minors?
3. Are production secrets rotated from demo values?
