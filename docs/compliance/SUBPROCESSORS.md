# Subprocessor & Third-Party Inventory — Pro Gradus

**DRAFT — verify contracts, regions, and DPAs with legal counsel before sharing with schools.**

| Vendor | Function | Student data? | Typical data | Location | Cookies / IDs | Independent use | Safeguards (action required) |
|--------|----------|---------------|--------------|----------|---------------|-----------------|------------------------------|
| **Railway** | App hosting, TLS termination | Yes (transient) | HTTP requests, env secrets | US (verify account) | Session cookie (first-party) | Infrastructure provider | Execute DPA; confirm encryption at rest |
| **PostgreSQL (via Railway or managed DB)** | Primary database | Yes | All application records | Same as Railway project | N/A | N/A | TLS to DB; least-privilege DB user; backup encryption review |
| **Cursor / development tools** | Engineering only | No in production* | Code, logs | US | N/A | N/A | No production student data in dev without authorization |
| **Email** | Not integrated for transactional mail in core app | No (today) | N/A | N/A | N/A | N/A | If added (password reset), update this table |
| **Analytics (GA, Segment, etc.)** | Not present in `src/` | No | N/A | N/A | N/A | N/A | Policy: do not add to student/coach pages without review |
| **Error monitoring (Sentry, etc.)** | Not present | No | N/A | N/A | N/A | N/A | If added, scrub PII and disable default breadcrumbs |
| **AI APIs** | Not used for student data in codebase | No | N/A | N/A | N/A | N/A | Prohibited for student records without school authorization |
| **Payment processors** | Not in app | No | N/A | N/A | N/A | N/A | N/A |
| **Capacitor / mobile SDKs** | Not detected in repo | N/A | N/A | N/A | N/A | N/A | Review before mobile ship |

\*Cloud agents and local dev may process synthetic/demo data only.

---

## Data flows

```
Student browser ──HTTPS──► Railway (Next.js) ──TLS──► PostgreSQL
                              │
                              └──► SecurityAuditLog (same DB)
```

No subprocessors receive student performance for analytics by default.

---

## School obligations

Schools remain responsible for:

- Authorizing subprocessors under their policies
- Executing the Data Processing Agreement (`SCHOOL_DPA.md` draft)
- Notifying families when required by state law

Update this file when adding email, SSO, monitoring, or AI features.
