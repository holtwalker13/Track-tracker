# Deployment & Infrastructure Security Guidance

**Requires verification on each production environment — settings are not auto-checked by the app.**

## Railway / production checklist

| Item | Requirement | Verification |
|------|-------------|--------------|
| HTTPS | All browser traffic TLS | Railway custom domain + force HTTPS |
| `SESSION_SECRET` | ≥16 chars, unique per env | Railway secrets, not in git |
| `DATABASE_URL` | TLS (`sslmode=require` if supported) | Connection string review |
| Encryption at rest | DB volumes & backups | Railway / provider docs + support ticket |
| Separate envs | Dev/staging/prod secrets and DBs | No prod dumps in dev without approval |
| DB access | Least-privilege role for app | Not superuser in production |
| Logs | No passwords/tokens in log drains | Review Railway log samples |
| Backups | Retention & restore tested | Document RPO/RTO with school |

## Application configuration

- Session cookie: `httpOnly`, `secure` in production, `sameSite=lax` (`src/lib/auth/cookie.ts`).
- Rate limiting is **in-memory** — with multiple replicas, configure sticky sessions or move limits to Redis.
- Run migrations: `npm run db:migrate` before deploy (`20261016000000_compliance_privacy`).

## Incident hooks

- Monitor `SecurityAuditLog` for spikes in `AUTH_LOGIN_FAILED`, `STUDENT_DATA_EXPORT`, `ADMIN_SCHOOL_CONTEXT_SET`.
- Disable user: set `User.disabledAt` (admin tooling TBD).

## Remaining infrastructure actions

- [ ] Confirm PostgreSQL encryption at rest with host
- [ ] Document backup expiration aligned with `DATA_RETENTION_AND_DELETION.md`
- [ ] WAF / DDoS at edge (optional, Railway + Cloudflare)
- [ ] Secret rotation procedure for `SESSION_SECRET` (invalidates all sessions)
