# Student & School Data Inventory — Pro Gradus

**DRAFT — for internal engineering and school transparency. Not legal advice.**

Primary identity key for students: **`StudentProfile.id`** (cuid UUID). Email, student number, and username are secondary identifiers used for login and roster matching — not primary keys.

---

## Student identity

| Data element | Purpose | Source | Storage | Recipients | Retention / deletion |
|--------------|---------|--------|---------|------------|-------------------|
| Legal name (`firstName`, `lastName`) | Roster, coach UI, optional leaderboard display | Coach import, manual roster, class join match | PostgreSQL `StudentProfile` | Coaches/admins at same school; student (self) | School-configured retention (`SchoolPrivacySettings.dataRetentionYears`) or contract; deletion via privacy request workflow |
| School student number | Roster ID, login email derivation | School roster / auto `S####` | `StudentProfile.studentNumber` | Same school staff | Same as profile |
| Username | Student login handle | Generated or coach-set | `StudentProfile.username` | Student, coaches | Same as profile |
| Email (synthetic `@school` domain) | Authentication | Derived at account creation | `User.email` | Auth system only | Deleted with user account |
| Date of birth | Age band / under-13 gate | Roster (default placeholder if omitted) | `StudentProfile.dateOfBirth` | Coaches, COPPA checks | Minimize accuracy in demo; schools should supply correct DOB |
| Gender | KPI targets, leaderboard filters | Roster | `StudentProfile.gender` | Authorized school users | Same as profile |
| School, class, coach associations | Authorization, reporting | Enrollments, `ClassCoach` | `ClassEnrollment`, `Class`, etc. | School staff | Cascade on deletion where configured |
| `anonymousId` | Pseudonymous leaderboards | Generated | `StudentProfile.anonymousId` | Students (peer view) | Same as profile |

---

## Educational & performance records

| Data element | Purpose | Source | Storage | Recipients | Retention |
|--------------|---------|--------|---------|------------|-----------|
| Testing session results | Assessment, PRs, medals | Live grid, import, workouts | `PerformanceResult` | Coaches, student (self), authorized peers on leaderboards | School retention policy |
| Workout set logs | S&C tracking | Student/coach logging | `WorkoutSetLog` | Coaches, student | Same |
| Achievements / XP / accolades | Engagement | App rules | Gamification tables | Student, coaches | Same |
| Attendance | Class presence | Coach entry | `ClassAttendance` | Coaches | Same |
| Notes / sports / participation type | Coaching context | Coach entry | `StudentProfile` fields | Coaches | Same |

---

## Authentication & security

| Data element | Purpose | Storage | Retention |
|--------------|---------|---------|-----------|
| Password hash | Auth | `User.passwordHash` | Until account deleted |
| Session JWT (cookie) | Session | Browser cookie (HttpOnly) | 7 days (all roles today) |
| Login invite token hash | One-time setup | `StudentLoginInvite`, `CoachLoginInvite` | Until used/expired |
| Class join token hash | Enrollment | `ClassJoinLink` | Until expiry/revocation |
| Security audit log | Accountability | `SecurityAuditLog` | Retain per incident/contract policy; not user-deletable |
| Rate-limit buckets | Abuse prevention | Process memory | Ephemeral |

Audit logs store **action metadata only** — not full student result payloads.

---

## Sensitive / unnecessary data (policy)

Pro Gradus **does not** intentionally collect: medical diagnoses, disability records, biometrics, precise GPS, or personal phone numbers in core schema. Schools should avoid entering medical content in free-text `notes`.

**Prohibited uses (product policy):** no behavioral advertising, marketing pixels on authenticated student pages, sale of student data, or third-party AI training on student performance without separate authorization.

---

## Data separation

- Student performance data lives in tenant-scoped PostgreSQL tables keyed by `schoolId`.
- No billing/marketing CRM integration in application codebase.
- Demo tenants (`General Demo`, `JHS`) must not be used for real student data without equivalent protections.

---

## Deletion & export

- **Export:** `GET /api/students/[id]/export` (authorized coach/admin, audited).
- **Deletion:** Existing coach delete flows + privacy request tracking (`PrivacyDataRequest`); full cascade anonymization job **partially implemented** — see `IMPLEMENTATION_REPORT.md`.
- **Backups:** Deleted rows may persist in backups until backup expiration — schools must be informed per contract.
