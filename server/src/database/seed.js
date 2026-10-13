const bcrypt = require('bcryptjs');
const { db, initSchema } = require('./db');

function seedDatabase() {
  console.log('🌱 Starting NFSU Placement Portal Database Seeding (2026-27)...');
  initSchema();

  // Clear existing data in reverse order of foreign keys
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM policy_violations;
    DELETE FROM drive_attendance;
    DELETE FROM offers;
    DELETE FROM drives;
    DELETE FROM users;
    DELETE FROM students;
  `);

  const passwordHash = bcrypt.hashSync('nfsu@2026', 10);
  const studentPasswordHash = bcrypt.hashSync('student123', 10);

  // 1. Seed Students across all 5 NFSU Programmes
  const insertStudent = db.prepare(`
    INSERT INTO students (
      placement_id, name, mobile, email, course, batch, cgpa, backlogs,
      registration_status, eligibility_status, placement_status, active_company,
      active_offer_type, active_category, internship_stipend, internship_period,
      fte_package, ppo_status, offer_acceptance, joining_status, offer_date,
      remarks, drives_banned_remaining, noc_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rawStudents = [
    // M.Sc. DFIS
    ['NFSU/2026/DFIS/001', 'Arjun Mehta', '+91 9876501001', 'arjun.mehta@nfsu.ac.in', 'M.Sc. DFIS', '2025-27', 9.2, 0, 'Registered', 'Eligible', 'FTE Only', 'Deloitte Cyber', 'F', 'A', 0, null, 12.5, 'N/A', 'Accepted', 'Joined', '2026-09-15', 'Eligible for Category A+ upgrade only', 0, 'Approved'],
    ['NFSU/2026/DFIS/002', 'Sneha Nair', '+91 9876501002', 'sneha.nair@nfsu.ac.in', 'M.Sc. DFIS', '2025-27', 9.5, 0, 'Registered', 'Eligible', 'Internship + PPO/FTE', 'Palo Alto Networks', 'I+F', 'A+', 75000, '6 Months', 18.5, 'Accepted', 'Accepted', 'Pending', '2026-09-20', 'Placed in A+; out of placement process', 0, 'Pending'],
    ['NFSU/2026/DFIS/003', 'Kabir Das', '+91 9876501003', 'kabir.das@nfsu.ac.in', 'M.Sc. DFIS', '2025-27', 8.1, 0, 'Registered', 'Eligible', 'Internship Only', 'Quick Heal', 'I', 'B', 25000, '6 Months', 0, 'Pending', 'Accepted', 'Pending', '2026-09-10', 'Can apply for FTE or I+F roles', 0, 'N/A'],
    ['NFSU/2026/DFIS/004', 'Tanvi Joshi', '+91 9876501004', 'tanvi.joshi@nfsu.ac.in', 'M.Sc. DFIS', '2025-27', 7.4, 1, 'Registered', 'Eligible', 'Unplaced', null, null, null, 0, null, 0, 'N/A', 'Pending', 'Pending', null, 'Active backlog in Cryptography', 0, 'N/A'],
    ['NFSU/2026/DFIS/005', 'Rohan Bhatia', '+91 9876501005', 'rohan.bhatia@nfsu.ac.in', 'M.Sc. DFIS', '2025-27', 6.8, 0, 'Registered', 'Eligible', 'Unplaced', null, null, null, 0, null, 0, 'N/A', 'Pending', 'Pending', null, 'Unexcused absence at CyberArk PPT; 3-drive ban active', 3, 'N/A'],

    // M.Tech. AIDS
    ['NFSU/2026/AIDS/001', 'Priya Sharma', '+91 9876502001', 'priya.sharma@nfsu.ac.in', 'M.Tech. AIDS', '2025-27', 9.4, 0, 'Registered', 'Eligible', 'Internship + PPO/FTE', 'Microsoft Security', 'I+F', 'A+', 80000, '6 Months', 24.0, 'Offered', 'Accepted', 'Pending', '2026-09-25', 'Highest FTE offer in school; process complete', 0, 'Approved'],
    ['NFSU/2026/AIDS/002', 'Aman Verma', '+91 9876502002', 'aman.verma@nfsu.ac.in', 'M.Tech. AIDS', '2025-27', 8.6, 0, 'Registered', 'Eligible', 'FTE Only', 'Quick Heal', 'F', 'B', 0, null, 7.5, 'N/A', 'Accepted', 'Pending', '2026-09-18', 'Category B (7.5 LPA); eligible for drives >= 11.25 LPA (1.5x)', 0, 'N/A'],
    ['NFSU/2026/AIDS/003', 'Ananya Patel', '+91 9876502003', 'ananya.patel@nfsu.ac.in', 'M.Tech. AIDS', '2025-27', 8.9, 0, 'Registered', 'Eligible', 'Unplaced', null, null, null, 0, null, 0, 'N/A', 'Pending', 'Pending', null, 'Awaiting shortlist', 0, 'N/A'],
    ['NFSU/2026/AIDS/004', 'Varun Iyer', '+91 9876502004', 'varun.iyer@nfsu.ac.in', 'M.Tech. AIDS', '2025-27', 7.2, 0, 'Registered', 'Pending Verification', 'Unplaced', null, null, null, 0, null, 0, 'N/A', 'Pending', 'Pending', null, 'Coordinator thesis clearance pending', 0, 'N/A'],

    // B.Tech.–M.Tech. CS
    ['NFSU/2026/IMCS/001', 'Rohit Verma', '+91 9876503001', 'rohit.verma@nfsu.ac.in', 'B.Tech.–M.Tech. CS', '2022-27', 9.1, 0, 'Registered', 'Eligible', 'FTE Only', 'CyberArk', 'F', 'A', 0, null, 14.0, 'N/A', 'Accepted', 'Joined', '2026-09-22', 'Category A offer (14 LPA); can only switch to Category A+', 0, 'Approved'],
    ['NFSU/2026/IMCS/002', 'Ishita Rao', '+91 9876503002', 'ishita.rao@nfsu.ac.in', 'B.Tech.–M.Tech. CS', '2022-27', 8.5, 0, 'Registered', 'Eligible', 'FTE Only', 'TCS Digital', 'F', 'C', 0, null, 5.5, 'N/A', 'Accepted', 'Pending', '2026-09-05', 'Category C offer (5.5 LPA); eligible for B, A, A+ upgrades', 0, 'N/A'],
    ['NFSU/2026/IMCS/003', 'Aditya Kulkarni', '+91 9876503003', 'aditya.k@nfsu.ac.in', 'B.Tech.–M.Tech. CS', '2022-27', 8.0, 0, 'Registered', 'Eligible', 'Unplaced', null, null, null, 0, null, 0, 'N/A', 'Pending', 'Pending', null, 'Eligible for all ongoing drives', 0, 'N/A'],
    ['NFSU/2026/IMCS/004', 'Deepika Sen', '+91 9876503004', 'deepika.sen@nfsu.ac.in', 'B.Tech.–M.Tech. CS', '2022-27', 6.0, 2, 'Deregistered', 'Ineligible', 'Unplaced', null, null, null, 0, null, 0, 'N/A', 'Pending', 'Pending', null, 'Opted for higher education overseas', 0, 'N/A'],

    // M.Tech. CS
    ['NFSU/2026/MTCS/001', 'Karan Singhania', '+91 9876504001', 'karan.s@nfsu.ac.in', 'M.Tech. CS', '2025-27', 8.8, 0, 'Registered', 'Eligible', 'FTE Only', 'Deloitte Cyber', 'F', 'A', 0, null, 12.5, 'N/A', 'Accepted', 'Pending', '2026-09-15', 'Category A; switching to A+ permitted', 0, 'Pending'],
    ['NFSU/2026/MTCS/002', 'Meera Nambiar', '+91 9876504002', 'meera.n@nfsu.ac.in', 'M.Tech. CS', '2025-27', 8.4, 0, 'Registered', 'Eligible', 'Unplaced', null, null, null, 0, null, 0, 'N/A', 'Pending', 'Pending', null, 'Cleared round 1 for Microsoft', 0, 'N/A'],
    ['NFSU/2026/MTCS/003', 'Siddharth Roy', '+91 9876504003', 'siddharth.r@nfsu.ac.in', 'M.Tech. CS', '2025-27', 7.9, 0, 'Not Registered', 'Pending Verification', 'Unplaced', null, null, null, 0, null, 0, 'N/A', 'Pending', 'Pending', null, 'Form submission incomplete', 0, 'N/A'],

    // M.Sc. CS
    ['NFSU/2026/MSCS/001', 'Bhavna Chauhan', '+91 9876505001', 'bhavna.c@nfsu.ac.in', 'M.Sc. CS', '2025-27', 8.7, 0, 'Registered', 'Eligible', 'FTE Only', 'Quick Heal', 'F', 'B', 0, null, 8.0, 'N/A', 'Accepted', 'Pending', '2026-09-18', 'Category B (8 LPA); switching allowed for >= 12 LPA', 0, 'N/A'],
    ['NFSU/2026/MSCS/002', 'Gaurav Trivedi', '+91 9876505002', 'gaurav.t@nfsu.ac.in', 'M.Sc. CS', '2025-27', 8.2, 0, 'Registered', 'Eligible', 'Unplaced', null, null, null, 0, null, 0, 'N/A', 'Pending', 'Pending', null, 'Seeking software development / forensics roles', 0, 'N/A']
  ];

  const studentIdMap = {};
  for (const s of rawStudents) {
    const res = insertStudent.run(...s);
    studentIdMap[s[0]] = res.lastInsertRowid;
  }
  console.log(`✅ Seeded ${rawStudents.length} Students across all 5 NFSU programmes.`);

  // 2. Seed Users (All 5 RBAC Roles)
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, assigned_course, company_name, student_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Administrators and Officers
  insertUser.run('admin', 'placement.head@nfsu.ac.in', passwordHash, 'admin', null, null, null);
  insertUser.run('officer', 'placement.officer@nfsu.ac.in', passwordHash, 'officer', null, null, null);

  // Course Coordinators
  insertUser.run('coord_dfis', 'coordinator.dfis@nfsu.ac.in', passwordHash, 'coordinator', 'M.Sc. DFIS', null, null);
  insertUser.run('coord_aids', 'coordinator.aids@nfsu.ac.in', passwordHash, 'coordinator', 'M.Tech. AIDS', null, null);
  insertUser.run('coord_cs', 'coordinator.cs@nfsu.ac.in', passwordHash, 'coordinator', 'M.Tech. CS', null, null);
  insertUser.run('coord_imcs', 'coordinator.imcs@nfsu.ac.in', passwordHash, 'coordinator', 'B.Tech.–M.Tech. CS', null, null);
  insertUser.run('coord_msc_cs', 'coordinator.msc_cs@nfsu.ac.in', passwordHash, 'coordinator', 'M.Sc. CS', null, null);

  // Recruiter Accounts
  insertUser.run('recruiter_paloalto', 'campus@paloaltonetworks.com', passwordHash, 'company', null, 'Palo Alto Networks', null);
  insertUser.run('recruiter_microsoft', 'university@microsoft.com', passwordHash, 'company', null, 'Microsoft Security', null);
  insertUser.run('recruiter_deloitte', 'campus.cyber@deloitte.com', passwordHash, 'company', null, 'Deloitte Cyber', null);
  insertUser.run('recruiter_quickheal', 'hr@quickheal.com', passwordHash, 'company', null, 'Quick Heal', null);

  // Student Accounts linked to Student IDs
  insertUser.run('student_arjun', 'arjun.mehta@nfsu.ac.in', studentPasswordHash, 'student', null, null, studentIdMap['NFSU/2026/DFIS/001']);
  insertUser.run('student_priya', 'priya.sharma@nfsu.ac.in', studentPasswordHash, 'student', null, null, studentIdMap['NFSU/2026/AIDS/001']);
  insertUser.run('student_rohit', 'rohit.verma@nfsu.ac.in', studentPasswordHash, 'student', null, null, studentIdMap['NFSU/2026/IMCS/001']);
  insertUser.run('student_ishita', 'ishita.rao@nfsu.ac.in', studentPasswordHash, 'student', null, null, studentIdMap['NFSU/2026/IMCS/002']);
  insertUser.run('student_rohan', 'rohan.bhatia@nfsu.ac.in', studentPasswordHash, 'student', null, null, studentIdMap['NFSU/2026/DFIS/005']);

  console.log('✅ Seeded RBAC Users (Admin, Officer, 5 Coordinators, 4 Recruiters, 5 Students).');

  // 3. Seed Recruitment Drives
  const insertDrive = db.prepare(`
    INSERT INTO drives (
      drive_code, company_name, category, offer_type, fte_package,
      internship_stipend, internship_duration, min_cgpa, max_backlogs,
      eligible_courses, batch, drive_date, acceptance_deadline_hours, status, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rawDrives = [
    [
      'DRV-2026-001', 'Microsoft Security', 'A+', 'I+F', 24.0, 80000, '6 Months', 8.5, 0,
      JSON.stringify(['M.Tech. AIDS', 'M.Tech. CS', 'B.Tech.–M.Tech. CS', 'M.Sc. DFIS']),
      '2025-27', '2026-09-24', 24, 'Completed', 'Cloud Security & Threat Intelligence Engineering role'
    ],
    [
      'DRV-2026-002', 'Palo Alto Networks', 'A+', 'I+F', 18.5, 75000, '6 Months', 8.0, 0,
      JSON.stringify(['M.Sc. DFIS', 'M.Tech. CS', 'M.Tech. AIDS', 'B.Tech.–M.Tech. CS']),
      '2025-27', '2026-09-18', 24, 'Completed', 'Prisma Cloud Security & Vulnerability Analysis'
    ],
    [
      'DRV-2026-003', 'CyberArk', 'A', 'F', 14.0, 0, null, 7.5, 0,
      JSON.stringify(['B.Tech.–M.Tech. CS', 'M.Sc. DFIS', 'M.Tech. CS']),
      '2025-27', '2026-09-20', 24, 'Completed', 'Privileged Access Management (PAM) Software Engineer'
    ],
    [
      'DRV-2026-004', 'Deloitte Cyber', 'A', 'F', 12.5, 40000, '6 Months', 7.0, 0,
      JSON.stringify(['M.Sc. DFIS', 'M.Tech. CS', 'M.Tech. AIDS', 'M.Sc. CS', 'B.Tech.–M.Tech. CS']),
      '2025-27', '2026-09-12', 24, 'Completed', 'Cyber Risk & Incident Response Consultant'
    ],
    [
      'DRV-2026-005', 'Quick Heal', 'B', 'I+F', 7.5, 25000, '6 Months', 6.5, 1,
      JSON.stringify(['M.Tech. AIDS', 'M.Sc. DFIS', 'M.Sc. CS', 'B.Tech.–M.Tech. CS']),
      '2025-27', '2026-09-08', 24, 'Completed', 'Malware Research & Endpoint Protection Engineer'
    ],
    [
      'DRV-2026-006', 'TCS Digital', 'C', 'F', 5.5, 0, null, 6.0, 1,
      JSON.stringify(['B.Tech.–M.Tech. CS', 'M.Sc. CS', 'M.Tech. CS']),
      '2022-27', '2026-09-02', 24, 'Completed', 'Enterprise Cybersecurity & Systems Engineer'
    ],
    [
      'DRV-2026-007', 'CrowdStrike', 'A+', 'F', 22.0, 0, null, 8.0, 0,
      JSON.stringify(['M.Sc. DFIS', 'M.Tech. CS', 'M.Tech. AIDS', 'B.Tech.–M.Tech. CS']),
      '2025-27', '2026-10-28', 24, 'Upcoming', 'Falcon Platform Detection Engineering & Threat Hunting'
    ]
  ];

  const driveIdMap = {};
  for (const d of rawDrives) {
    const res = insertDrive.run(...d);
    driveIdMap[d[0]] = res.lastInsertRowid;
  }
  console.log(`✅ Seeded ${rawDrives.length} Recruitment Drives across A+, A, B, and C categories.`);

  // 4. Seed Placement Offers History
  const insertOffer = db.prepare(`
    INSERT INTO offers (
      student_id, drive_id, company_name, category, offer_type,
      fte_package, internship_stipend, internship_period, ppo_status,
      offer_acceptance, joining_status, offer_date, acceptance_deadline,
      is_off_campus, noc_required, noc_status, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const pastDeadline = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  // Offers to demonstrate history preservation (e.g. Ishita got TCS first, then applied higher)
  insertOffer.run(
    studentIdMap['NFSU/2026/IMCS/002'], driveIdMap['DRV-2026-006'], 'TCS Digital', 'C', 'F',
    5.5, 0, null, 'N/A', 'Accepted', 'Pending', '2026-09-05', pastDeadline, 0, 0, 'N/A',
    'Base Category C offer accepted. Eligible for B, A, or A+ upgrades.'
  );

  insertOffer.run(
    studentIdMap['NFSU/2026/DFIS/001'], driveIdMap['DRV-2026-004'], 'Deloitte Cyber', 'A', 'F',
    12.5, 40000, '6 Months', 'N/A', 'Accepted', 'Joined', '2026-09-15', pastDeadline, 0, 1, 'Approved',
    'Category A offer accepted. Eligible only for Category A+.'
  );

  insertOffer.run(
    studentIdMap['NFSU/2026/DFIS/002'], driveIdMap['DRV-2026-002'], 'Palo Alto Networks', 'A+', 'I+F',
    18.5, 75000, '6 Months', 'Accepted', 'Accepted', 'Pending', '2026-09-20', pastDeadline, 0, 1, 'Pending',
    'Placed in A+ (18.5 LPA). Policy: completely out of placement process.'
  );

  insertOffer.run(
    studentIdMap['NFSU/2026/AIDS/001'], driveIdMap['DRV-2026-001'], 'Microsoft Security', 'A+', 'I+F',
    24.0, 80000, '6 Months', 'Offered', 'Accepted', 'Pending', '2026-09-25', pastDeadline, 0, 1, 'Approved',
    'Category A+ offer; highest CTC in 2026-27 cohort.'
  );

  insertOffer.run(
    studentIdMap['NFSU/2026/AIDS/002'], driveIdMap['DRV-2026-005'], 'Quick Heal', 'B', 'F',
    7.5, 0, null, 'N/A', 'Accepted', 'Pending', '2026-09-18', pastDeadline, 0, 0, 'N/A',
    'Category B offer (7.5 LPA). Under 1.5x rule, can switch to offers >= 11.25 LPA.'
  );

  insertOffer.run(
    studentIdMap['NFSU/2026/IMCS/001'], driveIdMap['DRV-2026-003'], 'CyberArk', 'A', 'F',
    14.0, 0, null, 'N/A', 'Accepted', 'Joined', '2026-09-22', pastDeadline, 0, 1, 'Approved',
    'Category A offer. Can only switch to A+.'
  );

  insertOffer.run(
    studentIdMap['NFSU/2026/MTCS/001'], driveIdMap['DRV-2026-004'], 'Deloitte Cyber', 'A', 'F',
    12.5, 40000, '6 Months', 'N/A', 'Accepted', 'Pending', '2026-09-15', pastDeadline, 0, 1, 'Pending',
    'Accepted Category A offer.'
  );

  insertOffer.run(
    studentIdMap['NFSU/2026/MSCS/001'], driveIdMap['DRV-2026-005'], 'Quick Heal', 'B', 'F',
    8.0, 0, null, 'N/A', 'Accepted', 'Pending', '2026-09-18', pastDeadline, 0, 0, 'N/A',
    'Category B offer (8.0 LPA). Switching allowed for >= 12.0 LPA.'
  );

  // An active pending offer for Arjun with 24-hour countdown
  insertOffer.run(
    studentIdMap['NFSU/2026/DFIS/003'], driveIdMap['DRV-2026-005'], 'Quick Heal', 'B', 'I',
    0, 25000, '6 Months', 'Pending', 'Accepted', 'Pending', '2026-09-10', pastDeadline, 0, 0, 'N/A',
    'Internship-only offer. May participate in FTE drives.'
  );

  // A pending offer waiting for student response
  insertOffer.run(
    studentIdMap['NFSU/2026/AIDS/003'], driveIdMap['DRV-2026-004'], 'Deloitte Cyber', 'A', 'F',
    12.5, 40000, '6 Months', 'N/A', 'Pending', 'Pending', new Date().toISOString().split('T')[0], tomorrow, 0, 1, 'Pending',
    'Offer issued; student response pending (24-hour window).'
  );

  console.log('✅ Seeded Offers history demonstrating preservation, deadlines, and multi-category tiers.');

  // 5. Seed Attendance Records
  const insertAttendance = db.prepare(`
    INSERT INTO drive_attendance (drive_id, student_id, activity_type, status, excuse_reason, excuse_approved, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-5 days'))
  `);

  insertAttendance.run(driveIdMap['DRV-2026-003'], studentIdMap['NFSU/2026/DFIS/001'], 'PPT', 'Present', null, 0);
  insertAttendance.run(driveIdMap['DRV-2026-003'], studentIdMap['NFSU/2026/DFIS/002'], 'PPT', 'Present', null, 0);
  insertAttendance.run(driveIdMap['DRV-2026-003'], studentIdMap['NFSU/2026/DFIS/005'], 'PPT', 'Absent', null, 0); // Triggered 3-drive ban!

  // 6. Seed Policy Violations Queue
  const insertViolation = db.prepare(`
    INSERT INTO policy_violations (student_id, drive_id, violation_type, description, status, timestamp)
    VALUES (?, ?, ?, ?, ?, datetime('now', '-3 days'))
  `);

  insertViolation.run(
    studentIdMap['NFSU/2026/DFIS/005'],
    driveIdMap['DRV-2026-003'],
    'ABSENTEEISM',
    'Unexcused absenteeism during Pre-Placement Talk for CyberArk. Excluded from next 3 drives per Section 3.2 guidelines.',
    'FLAGGED'
  );

  insertViolation.run(
    studentIdMap['NFSU/2026/IMCS/001'],
    driveIdMap['DRV-2026-005'],
    'UNAUTHORIZED_SWITCHING',
    'Student holding Category A offer (₹14.0 LPA at CyberArk) attempted registration for Category B drive (₹7.5 LPA at Quick Heal). Blocked automatically by Policy Engine.',
    'UNDER_REVIEW'
  );

  // 7. Seed Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (username, user_role, action, entity_type, entity_id, reason, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-2 days'))
  `);

  insertAudit.run('admin', 'admin', 'SYSTEM_INITIALIZATION', 'system', '2026-27', 'Initialized NFSU 2026-27 placement portal database and policy schemas');
  insertAudit.run('officer', 'officer', 'DRIVE_CREATE', 'drive', 'DRV-2026-001', 'Published Microsoft Security recruitment drive (Category A+)');
  insertAudit.run('coord_dfis', 'coordinator', 'ELIGIBILITY_STATUS_UPDATE', 'student', 'NFSU/2026/DFIS/001', 'Verified departmental academic clearance for M.Sc. DFIS');

  console.log('✅ NFSU Placement Database successfully seeded with 2026-27 guidelines and sample data!');
}

if (require.main === module) {
  seedDatabase();
  process.exit(0);
}

module.exports = { seedDatabase };
