# Parent / School Privacy Request Procedure (Draft)

**DRAFT — REQUIRES LEGAL REVIEW.**

## Principles

- **School-controlled records:** Parents and eligible students should contact the **school** first for access, correction, or deletion of education records.
- **Verified requests:** Pro Gradus fulfills requests from **authorized school officials** after identity verification.

## Request types

| Type | School action in app |
|------|----------------------|
| Access / review | Locate student; use profile + export API |
| Export | `GET /api/students/[id]/export` or privacy request ticket |
| Correction | Coach/admin update roster fields (audited) |
| Deletion | Privacy request + coach delete workflow; confirm cascades |

## Logging requests

Create a `PrivacyDataRequest` via **School → Privacy** (API: `POST /api/privacy/requests`).

## Timelines

Set response SLAs in the school contract — not fixed in product.

## Student self-service

Students may view their own performance in the app but cannot delete school-controlled records without school verification.

## Escalation

Unresolved issues: [privacy@ placeholder] with school CC.
