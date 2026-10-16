# Incident Response Policy (Draft)

**DRAFT — REQUIRES LEGAL REVIEW.**

## Objectives

Detect, contain, and recover from security incidents affecting student data; preserve evidence; notify schools per contractual and legal obligations.

## Roles

| Role | Responsibility |
|------|----------------|
| Security lead | Triage, coordination |
| Engineering | Containment, patching, log analysis |
| Legal / leadership | Notification decisions |
| School contact | Receives school-specific communications |

## Detection sources

- `SecurityAuditLog` anomalies (failed logins, export spikes, admin context changes)
- Infrastructure alerts (Railway, database)
- School or user reports

## Containment actions

- Disable compromised accounts (`User.disabledAt`)
- Revoke class join links / invites
- Rotate `SESSION_SECRET` (forces re-login)
- Block IP at edge if applicable

## Investigation

Preserve audit logs and relevant application logs; do **not** copy full student records into tickets.

## Notification

Breach notification timelines vary by contract and state law — **do not hard-code a universal deadline**. Legal counsel determines school and regulator notifications.

## Post-incident

Root cause analysis, update `SECURITY_AUDIT.md`, add regression tests where applicable.
