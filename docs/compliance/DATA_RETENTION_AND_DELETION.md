# Data Retention & Deletion Policy (Draft)

**DRAFT — REQUIRES LEGAL REVIEW AND SCHOOL CONTRACT ALIGNMENT.**

## Default principles

- Retain student performance data while the School maintains an active agreement and the student is enrolled in programs using Pro Gradus.
- `SchoolPrivacySettings.dataRetentionYears` may cap retention when set by an authorized administrator.
- Upon verified deletion request from an authorized School official, delete or anonymize identifiable student records in the primary database, including dependent results where configured.

## Backups & audit logs

- Database backups may retain deleted records until backup rotation expires — document schedule in `DEPLOYMENT_SECURITY.md`.
- Security audit logs may be retained longer for security and compliance investigations and are not deletable by end users.

## Contract termination

When a School terminates service:

1. Export window for authorized officials (recommended 30–90 days — contract-specific).
2. Delete tenant data after export period unless legally required to retain.
3. Confirm subprocessor deletion obligations.

## Student-initiated requests

Unverified student/parent requests are routed to the School, which controls education records under FERPA.
