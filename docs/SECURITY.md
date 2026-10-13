# Cybersecurity and Privacy Controls
## NFSU Placement Cell Management Portal (2026–27)

### 1. Security Architecture Summary
Because the NFSU Placement Cell processes sensitive student contact details, academic transcripts, and confidential corporate compensation figures, privacy and integrity are built into every layer.

| Security Control | Implementation Mechanism |
|---|---|
| **Authentication** | Cryptographically salted password hashing via `bcrypt` (10 rounds). Stateless JWT tokens with 8-hour expiry and signature validation. |
| **Role-Based Access Control (RBAC)** | Role validation middleware (`authorizeRoles`) strictly enforcing least privilege across 5 personas: `admin`, `officer`, `coordinator`, `company`, `student`. |
| **Insecure Direct Object Reference (IDOR) Defense** | Student roles are bound strictly to their own authenticated `student_id`. Attempting to view or modify another student's record is intercepted and returns `403 Forbidden`. |
| **SQL Injection Prevention** | 100% Parameterized queries executed using prepared statements in `better-sqlite3`. Zero raw string concatenation in SQL queries. |
| **Cross-Site Scripting (XSS) Defense** | Helmet security headers, JSON encoding for all REST outputs, and React's virtual DOM automatic output escaping. |
| **PII & Compensation Masking** | Dynamic data masking applied via `maskStudentPII` middleware: mobile numbers masked (`+91 ******1234`) for corporate recruiters and unauthorized personas. |
| **Tamper-Evident Audit Logging** | Dedicated `audit_logs` table recording actor, user role, action type, IP address, before/after JSON states, and documented rationale. |
| **Rate Limiting & DoS Protection** | `express-rate-limit` restricting IPs to 1,000 requests per 15-minute window. |
| **Export Security** | CSV exports require explicit role authentication and are logged in audit records with user identity and timestamp. |

---

### 2. Role-Based Permissions Matrix

| Resource / Action | Placement Administrator | Placement Officer | Course Coordinator | Corporate Recruiter | Student |
|---|:---:|:---:|:---:|:---:|:---:|
| View Dashboard Analytics | Full | Full | Scoped to Course | None | Self Profile |
| Create / Modify Student Profiles | Full | Full | Eligibility Only | None | Read-Only |
| View Unmasked Mobile Numbers | Yes | Yes | Own Course Only | Masked | Own Number |
| Publish Recruitment Drives | Yes | Yes | Read-Only | Own Drive | View Eligible |
| Issue Offers | Yes | Yes | No | Own Drive | No |
| Accept / Decline Offers | Yes | Yes | No | No | Own Offers (24h) |
| Authorize Policy Exception Waivers | Yes | Yes | No | No | No |
| View Audit Logs | Yes | No | No | No | No |
| CSV Data Export | Audited Full | Audited Full | Audited Course | No | No |

---

### 3. Automated Security Test Evidence
The automated test suite in `server/test/security.test.js` verifies:
- Unauthenticated requests are rejected with `401 Unauthorized`.
- Non-admin roles attempting to access audit logs receive `403 Forbidden`.
- Student attempting horizontal privilege escalation (viewing/editing other student records) is blocked with `403 Forbidden`.
- Search queries containing SQL injection payloads (`'; DROP TABLE students; --`) execute harmlessly with zero structural impact.
- PII masking helper properly redacts phone numbers and strips internal remarks from corporate recruiter responses.
