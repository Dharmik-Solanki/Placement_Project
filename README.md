# 🎓 NFSU Placement Cell Management Portal (2026–27)

> **Centralized, Policy-Driven Web Application for National Forensic Sciences University (NFSU)**  
> Developed in accordance with the official **Student Placement Guidelines for the 2026–27 Placement Session**.

[![NFSU Placement Portal CI](https://github.com/your-username/nfsu-placement-portal/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/nfsu-placement-portal)
[![Tests Passed](https://img.shields.io/badge/Tests-20%2F20%20Passing-brightgreen)](server/test)
[![Node.js](https://img.shields.io/badge/Node.js-v20%20%7C%20v22-blue)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18%20%7C%20Vite-61dafb)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-amber)](LICENSE)

---

## 📋 Table of Contents
1. [Programmes Covered](#-programmes-covered)
2. [Key Capabilities & Guidelines Implementation](#-key-capabilities--guidelines-implementation)
3. [Quick Start (Local Development)](#-quick-start-local-development)
4. [Role-Based Access (Demo Accounts)](#-role-based-access-demo-accounts)
5. [How to Deploy to GitHub](#-how-to-deploy-to-github)
6. [Cloud & Container Deployment](#-cloud--container-deployment)
7. [Automated Test Suite (Policy & Security)](#-automated-test-suite-policy--security)
8. [System Architecture & Schema](#-system-architecture--schema)
9. [Cybersecurity & Privacy Controls](#-cybersecurity--privacy-controls)

---

## 🏛️ Programmes Covered
The portal manages placement records across the 5 approved programmes under the **School of Cyber Security and Digital Forensics**:
1. **M.Tech. Computer Science** (`M.Tech. CS`)
2. **M.Tech. Artificial Intelligence and Data Science** (`M.Tech. AIDS`)
3. **B.Tech.–M.Tech. Computer Science and Engineering** (`B.Tech.–M.Tech. CS`)
4. **M.Sc. Computer Science** (`M.Sc. CS`)
5. **M.Sc. Digital Forensics and Information Security** (`M.Sc. DFIS`)

---

## ⚖️ Key Capabilities & Guidelines Implementation

### 1. Automated Policy Rule Engine & Explainable Decisions
- **Company Category Tiering**:
  - **Category A+ (≥ ₹16 LPA)**: No switching policy; selected candidates are completely out of further placement drives.
  - **Category A (₹10–16 LPA)**: Switching allowed strictly to Category A+ companies (≥ 16 LPA).
  - **Category B (₹6–10 LPA)**: Further placement allowed only where the new package is **at least 1.5 times the existing package**.
  - **Category C (< ₹6 LPA)**: Eligible for higher-category opportunities (B, A, A+) as per policy.
- **Offer-Type Restrictions**:
  - **Internship only (I)**: Candidate cannot apply for another internship-only role, but may apply for FTE or I+F roles.
  - **FTE only (F)**: Candidate cannot apply for another FTE-only role, but may apply for an internship role.
  - **Internship + PPO/FTE (I+F)**: Once selected, candidate cannot participate in other I, F, or I+F roles at another organization.
- **Recruitment Absenteeism Penalty**:
  - Automatically flags unexcused absenteeism during recruitment activities (PPTs, tests, interviews) with a **3-drive exclusion penalty**.
  - Integrated administrative emergency exception waiver workflow.
- **24-Hour Offer Acceptance Window**:
  - Tracks strict 24-hour response deadlines with live countdown timers and automatic expiration flagging.
- **Preserved Placement History**:
  - Full offer history is preserved in an immutable ledger rather than overwriting previous milestones.

### 2. Comprehensive Dashboard & Metrics
- Distinct separation of **Unique Placed Students** from **Total Offers Received**.
- Strict reporting separation of **Internship Stipends** (INR/month) from **Annual FTE CTC** (LPA).
- Exact **Highest, Average, and Median** compensation calculations.
- Live **Switching Policy Pool Tracker** (students eligible for higher drives).

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org) (v20 or v22 recommended)
- Git

### 1. Clone & Install
```bash
git clone https://github.com/<your-username>/ani_placement_project.git
cd ani_placement_project

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install frontend dependencies
cd client && npm install && cd ..
```

### 2. Seed the Database
Populate all 5 NFSU courses, realistic student profiles, sample drives, and offer histories:
```bash
npm run seed
```

### 3. Run the Development Servers
Starts both the Express API (`http://localhost:5000`) and the Vite React frontend (`http://localhost:5173`) with proxying enabled:
```bash
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 👥 Role-Based Access (Demo Accounts)

The portal provides an in-app **1-Click Persona Switcher** in the top navigation bar, or you can log in with these credentials:

| Persona Role | Username / Email | Password | Scope & Permissions |
|---|---|---|---|
| **Placement Administrator** | `admin` | `nfsu@2026` | Full system access, audit logs, policy overrides, user management |
| **Placement Officer** | `officer` | `nfsu@2026` | Drives management, attendance recording, offer issuance, waivers |
| **Course Coordinator** | `coord_dfis` | `nfsu@2026` | Scoped to **M.Sc. DFIS**, academic eligibility verification |
| **Corporate Recruiter** | `recruiter_paloalto` | `nfsu@2026` | Recruiter view for Palo Alto Networks (contact details masked) |
| **Student Candidate** | `student_arjun` | `student123` | Arjun Mehta (Candidate view, accept/decline offers, eligibility simulator) |

---

## 🐙 How to Deploy to GitHub

Follow these steps to initialize and push your project to your GitHub repository:

### Step 1: Initialize Git and Commit
```bash
# Verify you are in the project root directory
cd c:\Users\User\Desktop\Placement_PROJECT\ani_placement_project

# Initialize git repository (if not already initialized)
git init

# Add all files to staging
git add .

# Create initial commit
git commit -m "feat: complete NFSU placement cell management system 2026-27"
```

### Step 2: Create a New Repository on GitHub
1. Go to [GitHub New Repository](https://github.com/new).
2. Repository name: `nfsu-placement-portal` (or your preferred name).
3. Set to **Public** or **Private**.
4. Leave "Initialize this repository with a README" **unchecked** (we already created one).
5. Click **Create repository**.

### Step 3: Link Remote and Push
```bash
# Rename default branch to main
git branch -M main

# Add your GitHub repository remote (replace <your-username> with your GitHub username)
git remote add origin https://github.com/<your-username>/nfsu-placement-portal.git

# Push your code to GitHub
git push -u origin main
```

> **Note**: GitHub will prompt you for your GitHub Personal Access Token (PAT) or browser authentication.

---

## ☁️ Cloud & Container Deployment

### Option A: 1-Click Docker Deployment
The project includes a multi-stage `Dockerfile` and `docker-compose.yml`:
```bash
# Build and run container in detached mode
docker-compose up -d

# Check running status
docker-compose ps
```
The application will be live at `http://localhost:5000`. Database data is persisted across container restarts in the `nfsu_db_data` volume.

### Option B: Deploy to Render / Railway / Fly.io
1. Connect your GitHub repository to [Render](https://render.com) or [Railway](https://railway.app).
2. Set build command:
   ```bash
   cd client && npm install && npm run build && cd ../server && npm install && npm run seed
   ```
3. Set start command:
   ```bash
   cd server && node src/server.js
   ```
4. Set environment variable: `NODE_ENV=production` and `PORT=5000`.

---

## 🧪 Automated Test Suite (Policy & Security)

Run the automated test suite testing the Policy Rule Engine and cybersecurity defenses:
```bash
npm test
```

### Test Coverage Highlights:
- **Category Determination**: A+ (≥16 LPA), A (10–16 LPA), B (6–10 LPA), C (<6 LPA).
- **A+ Anti-Switching**: Selected A+ candidates strictly blocked from all subsequent drives.
- **A to A+ Restriction**: Category A candidates blocked from B or C; allowed only for A+.
- **B 1.5x Multiplier**: Candidate at 8.0 LPA blocked for 10.0 LPA, allowed for ≥ 12.0 LPA.
- **Offer-Type Rules**: Duplicate Internship (I) blocked; duplicate FTE (F) blocked; I+F full placement blocked.
- **Absenteeism Penalty**: Candidates with unexcused absence flagged for 3-drive ban.
- **IDOR Protection**: Student cannot view or modify other students' profiles (HTTP 403).
- **SQL Injection Resistance**: Parameterized queries immune to malicious SQL injection payloads.
- **PII Masking**: Recruiter responses automatically redact mobile phone numbers.

---

## 🛡️ Cybersecurity & Privacy Controls
- **Zero SQL Injection**: 100% Parameterized queries with prepared statements.
- **IDOR Defense**: Student token bound to `student_id`; vertical and horizontal escalation blocked.
- **Audit Logging**: Immutable `audit_logs` table tracking before/after JSON states, actor, timestamp, IP, and rationale.
- **Export Security**: Controlled CSV export with role check and audit trail.

---

## 📄 License
This project is licensed under the MIT License. Developed for the Placement Cell of National Forensic Sciences University (NFSU).
