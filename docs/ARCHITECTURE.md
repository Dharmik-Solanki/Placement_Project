# System Architecture & Technical Specifications
## NFSU Placement Cell Management Portal (Session 2026–27)

### 1. Architectural Overview
The system is designed as a three-tier, policy-driven web application:
- **Presentation Layer**: Single Page Application (SPA) built with React 18, Vite, Tailwind CSS, Lucide icons, and Recharts.
- **Application & Policy Engine Layer**: Node.js & Express RESTful API with automated business rules validation, role-based authorization guards, and tamper-evident audit middleware.
- **Data Persistence Layer**: SQLite 3 database operating in WAL (Write-Ahead Logging) mode with strict foreign key constraints, atomic transactions, and parameterized SQL queries.

---

### 2. Programmes Covered
The application strictly supports the five approved academic programmes under the School of Cyber Security & Digital Forensics:
1. `M.Tech. Computer Science` (`M.Tech. CS`)
2. `M.Tech. Artificial Intelligence and Data Science` (`M.Tech. AIDS`)
3. `B.Tech.–M.Tech. Computer Science and Engineering` (`B.Tech.–M.Tech. CS`)
4. `M.Sc. Computer Science` (`M.Sc. CS`)
5. `M.Sc. Digital Forensics and Information Security` (`M.Sc. DFIS`)

---

### 3. Database Schema Design

#### `students`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `placement_id` | TEXT | UNIQUE, NOT NULL (e.g. `NFSU/2026/DFIS/001`) |
| `name` | TEXT | Full institutional name |
| `mobile` | TEXT | Contact number (masked for non-authorized roles) |
| `email` | TEXT | UNIQUE, NOT NULL institutional email |
| `course` | TEXT | Foreign key to `programmes(code)` |
| `batch` | TEXT | Academic batch (e.g. `2025-27`) |
| `cgpa` | REAL | Cumulative GPA |
| `backlogs` | INTEGER | Count of active backlogs |
| `registration_status` | TEXT | `Registered`, `Deregistered`, `Not Registered` |
| `eligibility_status` | TEXT | `Eligible`, `Ineligible`, `Pending Verification` |
| `placement_status` | TEXT | `Unplaced`, `Internship Only`, `FTE Only`, `Internship + PPO/FTE` |
| `active_company` | TEXT | Name of recruiting organization |
| `active_offer_type` | TEXT | `I`, `F`, `I+F` |
| `active_category` | TEXT | `A+`, `A`, `B`, `C` |
| `internship_stipend`| REAL | Monthly compensation in INR |
| `fte_package` | REAL | Annual CTC compensation in LPA |
| `ppo_status` | TEXT | `N/A`, `Pending`, `Offered`, `Accepted`, `Declined` |
| `offer_acceptance` | TEXT | `Pending`, `Accepted`, `Declined`, `Expired` |
| `joining_status` | TEXT | `Pending`, `Joined`, `Not Joined` |
| `drives_banned_remaining` | INTEGER | Absenteeism penalty drive exclusion counter (default 0) |
| `noc_status` | TEXT | `N/A`, `Pending`, `Approved`, `Rejected` |
| `is_archived` | INTEGER | 0 = Active, 1 = Soft-archived |

#### `offers` (Placement History Preservation)
Preserves all historical offer events without overwriting previous selections:
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `student_id` | INTEGER | Foreign key to `students(id)` |
| `drive_id` | INTEGER | Foreign key to `drives(id)` |
| `company_name` | TEXT | Organization name |
| `category` | TEXT | `A+`, `A`, `B`, `C` |
| `offer_type` | TEXT | `I`, `F`, `I+F` |
| `fte_package` | REAL | Annual CTC in LPA |
| `internship_stipend` | REAL | Monthly stipend in INR |
| `offer_acceptance` | TEXT | `Pending`, `Accepted`, `Declined`, `Expired` |
| `acceptance_deadline` | TEXT | RFC 3339 timestamp (24h acceptance window) |
| `is_off_campus` | INTEGER | 0 = On-campus, 1 = Off-campus drive |
| `noc_status` | TEXT | Status of No Objection Certificate |

---

### 4. NFSU Policy Rule Engine Flowchart

```
                 [Student Application / Offer Request]
                                   │
                     Is Student Registered & Eligible?
                                 /   \
                              No/     \Yes
                               /       \
                     [BLOCKED]          Has Active Absenteeism Ban?
                                            /   \
                                         Yes/    \No
                                           /      \
                             [FLAGGED_FOR_REVIEW]  Course, CGPA & Backlogs Match?
                                                       /   \
                                                    No/     \Yes
                                                     /       \
                                           [BLOCKED]          Evaluate Offer Type & Switching Category
                                                                  │
                                            ┌─────────────────────┼─────────────────────┐
                                            ▼                     ▼                     ▼
                                       Current A+             Current A             Current B
                                     (≥16 LPA FTE)         (10–16 LPA FTE)        (6–10 LPA FTE)
                                            │                     │                     │
                                     [NO SWITCHING]       Is New Drive A+?      Is New CTC ≥ 1.5x?
                                     Process Complete         /      \              /        \
                                            │              Yes/       \No        Yes/         \No
                                            ▼                /         \           /           \
                                        [BLOCKED]       [ALLOWED]   [BLOCKED]  [ALLOWED]   [BLOCKED]
```

---

### 5. API Endpoints Map
- **Authentication**: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/demo-switch`
- **Students**: `GET /api/students`, `POST /api/students`, `PUT /api/students/:id`, `PATCH /api/students/:id/archive`, `GET /api/students/export/csv`, `POST /api/students/import/csv`
- **Drives**: `GET /api/drives`, `POST /api/drives`, `GET /api/drives/:id/candidates-eligibility`
- **Offers**: `GET /api/offers`, `POST /api/offers`, `PATCH /api/offers/:id/acceptance`, `PATCH /api/offers/:id/joining-noc`
- **Policy Engine**: `POST /api/policy/simulate`, `GET /api/policy/violations`, `PATCH /api/policy/violations/:id`, `GET /api/policy/guidelines`
- **Attendance**: `POST /api/attendance/record`, `POST /api/attendance/emergency-waiver`
- **Reports**: `GET /api/reports/dashboard`, `GET /api/reports/company-report`
- **Audit**: `GET /api/audit`
