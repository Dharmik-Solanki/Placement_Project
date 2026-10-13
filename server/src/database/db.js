const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.resolve(__dirname, '../../data/placement.db');

// Ensure data directory exists if writing to file
if (dbPath !== ':memory:') {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const db = new Database(dbPath, {
  // verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enforce foreign keys and WAL journal mode for performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
function initSchema() {
  db.exec(`
    -- Valid Programmes table
    CREATE TABLE IF NOT EXISTS programmes (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL
    );

    -- Users Table (RBAC: admin, officer, coordinator, company, student)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'officer', 'coordinator', 'company', 'student')) NOT NULL,
      assigned_course TEXT,
      company_name TEXT,
      student_id INTEGER,
      mfa_enabled INTEGER DEFAULT 0,
      mfa_secret TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Students Database
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placement_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      course TEXT NOT NULL,
      batch TEXT NOT NULL,
      cgpa REAL NOT NULL DEFAULT 0.0,
      backlogs INTEGER NOT NULL DEFAULT 0,
      registration_status TEXT CHECK(registration_status IN ('Registered', 'Deregistered', 'Not Registered')) DEFAULT 'Registered',
      eligibility_status TEXT CHECK(eligibility_status IN ('Eligible', 'Ineligible', 'Pending Verification')) DEFAULT 'Pending Verification',
      placement_status TEXT CHECK(placement_status IN ('Unplaced', 'Internship Only', 'FTE Only', 'Internship + PPO/FTE')) DEFAULT 'Unplaced',
      active_company TEXT,
      active_offer_type TEXT CHECK(active_offer_type IN ('I', 'F', 'I+F', NULL)),
      active_category TEXT CHECK(active_category IN ('A+', 'A', 'B', 'C', NULL)),
      internship_stipend REAL DEFAULT 0.0,
      internship_period TEXT,
      fte_package REAL DEFAULT 0.0,
      ppo_status TEXT CHECK(ppo_status IN ('N/A', 'Pending', 'Offered', 'Accepted', 'Declined')) DEFAULT 'N/A',
      offer_acceptance TEXT CHECK(offer_acceptance IN ('Pending', 'Accepted', 'Declined', 'Expired')) DEFAULT 'Pending',
      joining_status TEXT CHECK(joining_status IN ('Pending', 'Joined', 'Not Joined')) DEFAULT 'Pending',
      offer_date TEXT,
      remarks TEXT,
      drives_banned_remaining INTEGER DEFAULT 0,
      noc_status TEXT CHECK(noc_status IN ('N/A', 'Pending', 'Approved', 'Rejected')) DEFAULT 'N/A',
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course) REFERENCES programmes(code)
    );

    -- Recruitment Drives Table
    CREATE TABLE IF NOT EXISTS drives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drive_code TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      category TEXT CHECK(category IN ('A+', 'A', 'B', 'C')) NOT NULL,
      offer_type TEXT CHECK(offer_type IN ('I', 'F', 'I+F')) NOT NULL,
      fte_package REAL DEFAULT 0.0,
      internship_stipend REAL DEFAULT 0.0,
      internship_duration TEXT,
      min_cgpa REAL DEFAULT 6.0,
      max_backlogs INTEGER DEFAULT 0,
      eligible_courses TEXT NOT NULL, -- JSON array of course codes
      batch TEXT NOT NULL,
      drive_date TEXT NOT NULL,
      acceptance_deadline_hours INTEGER DEFAULT 24,
      status TEXT CHECK(status IN ('Upcoming', 'Ongoing', 'Completed', 'Cancelled')) DEFAULT 'Ongoing',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Complete Placement History / Offers Table
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      drive_id INTEGER,
      company_name TEXT NOT NULL,
      category TEXT CHECK(category IN ('A+', 'A', 'B', 'C')) NOT NULL,
      offer_type TEXT CHECK(offer_type IN ('I', 'F', 'I+F')) NOT NULL,
      fte_package REAL DEFAULT 0.0,
      internship_stipend REAL DEFAULT 0.0,
      internship_period TEXT,
      ppo_status TEXT CHECK(ppo_status IN ('N/A', 'Pending', 'Offered', 'Accepted', 'Declined')) DEFAULT 'N/A',
      offer_acceptance TEXT CHECK(offer_acceptance IN ('Pending', 'Accepted', 'Declined', 'Expired')) DEFAULT 'Pending',
      joining_status TEXT CHECK(joining_status IN ('Pending', 'Joined', 'Not Joined')) DEFAULT 'Pending',
      offer_date TEXT NOT NULL,
      acceptance_deadline TEXT NOT NULL,
      is_off_campus INTEGER DEFAULT 0,
      noc_required INTEGER DEFAULT 0,
      noc_status TEXT CHECK(noc_status IN ('N/A', 'Pending', 'Approved', 'Rejected')) DEFAULT 'N/A',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE SET NULL
    );

    -- Drive Attendance & Absenteeism Tracking
    CREATE TABLE IF NOT EXISTS drive_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drive_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      activity_type TEXT CHECK(activity_type IN ('PPT', 'Online Test', 'Technical Interview', 'HR Interview')) NOT NULL,
      status TEXT CHECK(status IN ('Present', 'Absent', 'Excused')) NOT NULL,
      excuse_reason TEXT,
      excuse_approved INTEGER DEFAULT 0,
      recorded_by INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (recorded_by) REFERENCES users(id)
    );

    -- Policy Violations & Exceptions Queue
    CREATE TABLE IF NOT EXISTS policy_violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      drive_id INTEGER,
      violation_type TEXT CHECK(violation_type IN ('ABSENTEEISM', 'UNAUTHORIZED_SWITCHING', 'CONCURRENT_OFFER_CONFLICT', 'REGISTRATION_BYPASS', 'OTHER')) NOT NULL,
      description TEXT NOT NULL,
      status TEXT CHECK(status IN ('FLAGGED', 'UNDER_REVIEW', 'WAIVED', 'PENALTY_ENFORCED')) DEFAULT 'FLAGGED',
      action_taken TEXT,
      reviewed_by INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    -- Tamper-Evident Audit Logging Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      before_state TEXT,
      after_state TEXT,
      ip_address TEXT,
      reason TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- System Configuration / Policy Thresholds
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );

    -- Create helpful indexes for performance and fast query filtering
    CREATE INDEX IF NOT EXISTS idx_students_placement_id ON students(placement_id);
    CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);
    CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch);
    CREATE INDEX IF NOT EXISTS idx_students_placement_status ON students(placement_status);
    CREATE INDEX IF NOT EXISTS idx_students_registration_status ON students(registration_status);
    CREATE INDEX IF NOT EXISTS idx_offers_student_id ON offers(student_id);
    CREATE INDEX IF NOT EXISTS idx_offers_acceptance ON offers(offer_acceptance);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON drive_attendance(student_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_drive ON drive_attendance(drive_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
  `);

  // Seed default programmes if empty
  const progCount = db.prepare('SELECT COUNT(*) as count FROM programmes').get().count;
  if (progCount === 0) {
    const insertProg = db.prepare('INSERT INTO programmes (code, name, department) VALUES (?, ?, ?)');
    const defaultProgrammes = [
      ['M.Tech. CS', 'M.Tech. Computer Science', 'School of Cyber Security and Digital Forensics'],
      ['M.Tech. AIDS', 'M.Tech. Artificial Intelligence and Data Science', 'School of Cyber Security and Digital Forensics'],
      ['B.Tech.–M.Tech. CS', 'B.Tech.–M.Tech. Computer Science and Engineering', 'School of Cyber Security and Digital Forensics'],
      ['M.Sc. CS', 'M.Sc. Computer Science', 'School of Cyber Security and Digital Forensics'],
      ['M.Sc. DFIS', 'M.Sc. Digital Forensics and Information Security', 'School of Cyber Security and Digital Forensics']
    ];
    for (const prog of defaultProgrammes) {
      insertProg.run(prog[0], prog[1], prog[2]);
    }
  }

  // Seed system settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM system_settings').get().count;
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)');
    insertSetting.run('CATEGORY_A_PLUS_MIN_CTC', '16.0', 'Minimum CTC in LPA for Category A+');
    insertSetting.run('CATEGORY_A_MIN_CTC', '10.0', 'Minimum CTC in LPA for Category A');
    insertSetting.run('CATEGORY_B_MIN_CTC', '6.0', 'Minimum CTC in LPA for Category B');
    insertSetting.run('SWITCHING_MULTIPLIER_B', '1.5', 'Multiplier required to switch from Category B (e.g. 1.5x)');
    insertSetting.run('ABSENTEEISM_BAN_COUNT', '3', 'Number of upcoming drives banned upon unexcused absenteeism');
    insertSetting.run('OFFER_ACCEPTANCE_HOURS', '24', 'Default deadline hours for offer acceptance');
    insertSetting.run('SESSION_YEAR', '2026-27', 'Active placement academic session');
  }
}

initSchema();

module.exports = {
  db,
  initSchema
};
