const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles, maskStudentPII } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { determineCategory } = require('../policy/policyEngine');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// List students with filters, search, and pagination
router.get('/', authenticateToken, (req, res) => {
  const {
    course,
    batch,
    placement_status,
    registration_status,
    eligibility_status,
    search,
    include_archived = 'false',
    page = 1,
    limit = 50
  } = req.query;

  let query = 'SELECT * FROM students WHERE 1=1';
  const params = [];

  // Course coordinator restriction: can only view students of assigned course
  if (req.user.role === 'coordinator' && req.user.assigned_course) {
    query += ' AND course = ?';
    params.push(req.user.assigned_course);
  } else if (course && course !== 'ALL') {
    query += ' AND course = ?';
    params.push(course);
  }

  // Student role restriction: can ONLY see their own record (Anti-IDOR)
  if (req.user.role === 'student' && req.user.student_id) {
    query += ' AND id = ?';
    params.push(req.user.student_id);
  }

  if (include_archived !== 'true') {
    query += ' AND is_archived = 0';
  }

  if (batch) {
    query += ' AND batch = ?';
    params.push(batch);
  }

  if (placement_status && placement_status !== 'ALL') {
    query += ' AND placement_status = ?';
    params.push(placement_status);
  }

  if (registration_status && registration_status !== 'ALL') {
    query += ' AND registration_status = ?';
    params.push(registration_status);
  }

  if (eligibility_status && eligibility_status !== 'ALL') {
    query += ' AND eligibility_status = ?';
    params.push(eligibility_status);
  }

  if (search) {
    query += ' AND (name LIKE ? OR placement_id LIKE ? OR email LIKE ? OR active_company LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY course ASC, placement_id ASC';

  // Get total count
  const countQuery = query.replace('SELECT * FROM', 'SELECT COUNT(*) as total FROM');
  const total = db.prepare(countQuery).get(...params).total;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), offset);

  const students = db.prepare(query).all(...params);

  // Apply privacy / PII masking
  const maskedStudents = students.map(s => maskStudentPII(s, req.user.role, req.user.assigned_course));

  res.json({
    success: true,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    students: maskedStudents
  });
});

// Get single student details with complete placement offer history
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Student role IDOR protection
  if (req.user.role === 'student' && req.user.student_id !== parseInt(id, 10)) {
    return res.status(403).json({ success: false, error: 'Access denied. You cannot view other student records.' });
  }

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student record not found.' });
  }

  // Course coordinator restriction
  if (req.user.role === 'coordinator' && req.user.assigned_course && student.course !== req.user.assigned_course) {
    return res.status(403).json({ success: false, error: `Access restricted. You are only authorized for ${req.user.assigned_course}.` });
  }

  // Fetch full placement offer history (preserves all offers, never overwritten)
  const offers = db.prepare(`
    SELECT o.*, d.drive_code, d.drive_date 
    FROM offers o 
    LEFT JOIN drives d ON o.drive_id = d.id 
    WHERE o.student_id = ? 
    ORDER BY o.offer_date DESC, o.id DESC
  `).all(id);

  // Fetch attendance records
  const attendance = db.prepare(`
    SELECT a.*, d.company_name, d.drive_code 
    FROM drive_attendance a 
    JOIN drives d ON a.drive_id = d.id 
    WHERE a.student_id = ? 
    ORDER BY a.timestamp DESC
  `).all(id);

  // Fetch policy violations
  const violations = db.prepare(`
    SELECT v.*, d.company_name, d.drive_code 
    FROM policy_violations v 
    LEFT JOIN drives d ON v.drive_id = d.id 
    WHERE v.student_id = ? 
    ORDER BY v.timestamp DESC
  `).all(id);

  res.json({
    success: true,
    student: maskStudentPII(student, req.user.role, req.user.assigned_course),
    offers,
    attendance,
    violations
  });
});

// Create student record (Admin, Officer)
router.post('/', authenticateToken, authorizeRoles('admin', 'officer'), (req, res) => {
  const {
    placement_id,
    name,
    mobile,
    email,
    course,
    batch,
    cgpa = 0.0,
    backlogs = 0,
    registration_status = 'Registered',
    eligibility_status = 'Pending Verification',
    remarks = ''
  } = req.body;

  if (!placement_id || !name || !email || !course || !batch) {
    return res.status(400).json({ success: false, error: 'Placement ID, Name, Email, Course, and Batch are required.' });
  }

  // Reject duplicate placement ID or email
  const existing = db.prepare('SELECT id, placement_id, email FROM students WHERE placement_id = ? OR email = ?').get(placement_id, email);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: existing.placement_id === placement_id
        ? `Duplicate Placement ID: ${placement_id} already exists.`
        : `Email ${email} is already registered.`
    });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO students (
        placement_id, name, mobile, email, course, batch, cgpa, backlogs,
        registration_status, eligibility_status, remarks, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      placement_id.trim().toUpperCase(),
      name.trim(),
      mobile.trim(),
      email.trim().toLowerCase(),
      course.trim(),
      batch.trim(),
      parseFloat(cgpa) || 0.0,
      parseInt(backlogs, 10) || 0,
      registration_status,
      eligibility_status,
      remarks
    );

    const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);

    logAudit(req, {
      action: 'STUDENT_CREATE',
      entityType: 'student',
      entityId: newStudent.id,
      afterState: newStudent,
      reason: `Created student profile ${newStudent.placement_id}`
    });

    res.status(201).json({ success: true, student: newStudent });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update student record
router.put('/:id', authenticateToken, authorizeRoles('admin', 'officer', 'coordinator'), (req, res) => {
  const { id } = req.params;
  const current = db.prepare('SELECT * FROM students WHERE id = ?').get(id);

  if (!current) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  // Coordinator permission check: can ONLY modify students in their course and only eligibility status
  if (req.user.role === 'coordinator') {
    if (req.user.assigned_course && current.course !== req.user.assigned_course) {
      return res.status(403).json({ success: false, error: `Unauthorized. You can only update ${req.user.assigned_course} students.` });
    }

    const { eligibility_status, remarks } = req.body;
    if (!eligibility_status) {
      return res.status(400).json({ success: false, error: 'Coordinator can only update eligibility status and remarks.' });
    }

    db.prepare(`
      UPDATE students 
      SET eligibility_status = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(eligibility_status, remarks || current.remarks, id);

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);

    logAudit(req, {
      action: 'ELIGIBILITY_STATUS_UPDATE',
      entityType: 'student',
      entityId: id,
      beforeState: { eligibility_status: current.eligibility_status },
      afterState: { eligibility_status },
      reason: `Coordinator verified eligibility: ${eligibility_status}`
    });

    return res.json({ success: true, student: updated });
  }

  // Admin / Officer updates
  const {
    name, mobile, email, course, batch, cgpa, backlogs,
    registration_status, eligibility_status, placement_status,
    active_company, active_offer_type, internship_stipend,
    internship_period, fte_package, ppo_status, offer_acceptance,
    joining_status, offer_date, remarks, drives_banned_remaining, noc_status
  } = req.body;

  const stmt = db.prepare(`
    UPDATE students SET
      name = COALESCE(?, name),
      mobile = COALESCE(?, mobile),
      email = COALESCE(?, email),
      course = COALESCE(?, course),
      batch = COALESCE(?, batch),
      cgpa = COALESCE(?, cgpa),
      backlogs = COALESCE(?, backlogs),
      registration_status = COALESCE(?, registration_status),
      eligibility_status = COALESCE(?, eligibility_status),
      placement_status = COALESCE(?, placement_status),
      active_company = COALESCE(?, active_company),
      active_offer_type = COALESCE(?, active_offer_type),
      active_category = ?,
      internship_stipend = COALESCE(?, internship_stipend),
      internship_period = COALESCE(?, internship_period),
      fte_package = COALESCE(?, fte_package),
      ppo_status = COALESCE(?, ppo_status),
      offer_acceptance = COALESCE(?, offer_acceptance),
      joining_status = COALESCE(?, joining_status),
      offer_date = COALESCE(?, offer_date),
      remarks = COALESCE(?, remarks),
      drives_banned_remaining = COALESCE(?, drives_banned_remaining),
      noc_status = COALESCE(?, noc_status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const effectiveFtePackage = fte_package !== undefined ? parseFloat(fte_package) : current.fte_package;
  const newCategory = effectiveFtePackage > 0 ? determineCategory(effectiveFtePackage) : null;

  stmt.run(
    name, mobile, email, course, batch,
    cgpa !== undefined ? parseFloat(cgpa) : null,
    backlogs !== undefined ? parseInt(backlogs, 10) : null,
    registration_status, eligibility_status, placement_status,
    active_company, active_offer_type, newCategory,
    internship_stipend !== undefined ? parseFloat(internship_stipend) : null,
    internship_period,
    fte_package !== undefined ? parseFloat(fte_package) : null,
    ppo_status, offer_acceptance, joining_status,
    offer_date, remarks,
    drives_banned_remaining !== undefined ? parseInt(drives_banned_remaining, 10) : null,
    noc_status,
    id
  );

  const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);

  logAudit(req, {
    action: 'STUDENT_UPDATE',
    entityType: 'student',
    entityId: id,
    beforeState: current,
    afterState: updated,
    reason: 'Updated student profile data'
  });

  res.json({ success: true, student: updated });
});

// Controlled Archive / Unarchive (Admin only)
router.patch('/:id/archive', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { id } = req.params;
  const { archive = true, reason = 'Archived by Placement Administrator' } = req.body;

  const current = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!current) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  const archiveVal = archive ? 1 : 0;
  db.prepare('UPDATE students SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(archiveVal, id);

  logAudit(req, {
    action: archive ? 'STUDENT_ARCHIVED' : 'STUDENT_UNARCHIVED',
    entityType: 'student',
    entityId: id,
    beforeState: { is_archived: current.is_archived },
    afterState: { is_archived: archiveVal },
    reason
  });

  res.json({ success: true, message: `Student ${archive ? 'archived' : 'restored'} successfully.` });
});

// Controlled CSV Export with role checks, PII protection, and audit tracking
router.get('/export/csv', authenticateToken, authorizeRoles('admin', 'officer', 'coordinator'), (req, res) => {
  const { course, batch, placement_status } = req.query;

  let query = 'SELECT * FROM students WHERE is_archived = 0';
  const params = [];

  if (req.user.role === 'coordinator' && req.user.assigned_course) {
    query += ' AND course = ?';
    params.push(req.user.assigned_course);
  } else if (course && course !== 'ALL') {
    query += ' AND course = ?';
    params.push(course);
  }

  if (batch) {
    query += ' AND batch = ?';
    params.push(batch);
  }

  if (placement_status && placement_status !== 'ALL') {
    query += ' AND placement_status = ?';
    params.push(placement_status);
  }

  query += ' ORDER BY course ASC, placement_id ASC';

  const rows = db.prepare(query).all(...params);

  // Mask sensitive PII if role has restrictions
  const processedRows = rows.map(s => {
    const masked = maskStudentPII(s, req.user.role, req.user.assigned_course);
    return {
      'Placement ID': masked.placement_id,
      'Student Name': masked.name,
      'Email': masked.email,
      'Mobile Number': masked.mobile,
      'Course': masked.course,
      'Batch': masked.batch,
      'CGPA': masked.cgpa,
      'Backlogs': masked.backlogs,
      'Registration Status': masked.registration_status,
      'Eligibility Status': masked.eligibility_status,
      'Placement Status': masked.placement_status,
      'Company': masked.active_company || 'N/A',
      'Offer Type': masked.active_offer_type || 'N/A',
      'Category': masked.active_category || 'N/A',
      'Internship Stipend (INR/mo)': masked.internship_stipend || 0,
      'FTE Package (LPA)': masked.fte_package || 0,
      'PPO Status': masked.ppo_status,
      'Offer Acceptance': masked.offer_acceptance,
      'Joining Status': masked.joining_status,
      'NOC Status': masked.noc_status,
      'Remarks': masked.remarks || ''
    };
  });

  const csvData = stringify(processedRows, { header: true });

  logAudit(req, {
    action: 'EXPORT_STUDENT_CSV',
    entityType: 'student',
    entityId: `records_${rows.length}`,
    reason: `Exported ${rows.length} student records to CSV (Filters: course=${course || 'ALL'})`
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=NFSU_Placements_${course || 'All'}_${Date.now()}.csv`);
  res.send(csvData);
});

// CSV Import endpoint with duplicate prevention and validation
router.post('/import/csv', authenticateToken, authorizeRoles('admin', 'officer'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'CSV file is required.' });
  }

  let records = [];
  try {
    records = parse(req.file.buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: `Invalid CSV format: ${err.message}` });
  }

  const validCourses = ['M.Tech. CS', 'M.Tech. AIDS', 'B.Tech.–M.Tech. CS', 'M.Sc. CS', 'M.Sc. DFIS'];
  const insertStmt = db.prepare(`
    INSERT INTO students (
      placement_id, name, mobile, email, course, batch, cgpa, backlogs,
      registration_status, eligibility_status, remarks, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const results = {
    total: records.length,
    imported: 0,
    skipped: 0,
    errors: []
  };

  const importTransaction = db.transaction((rows) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const placement_id = row['Placement ID'] || row['placement_id'];
      const name = row['Student Name'] || row['name'];
      const email = row['Email'] || row['email'];
      const mobile = row['Mobile Number'] || row['mobile'] || 'N/A';
      const course = row['Course'] || row['course'];
      const batch = row['Batch'] || row['batch'] || '2025-27';
      const cgpa = parseFloat(row['CGPA'] || row['cgpa'] || '0.0');
      const backlogs = parseInt(row['Backlogs'] || row['backlogs'] || '0', 10);
      const regStatus = row['Registration Status'] || row['registration_status'] || 'Registered';
      const eligStatus = row['Eligibility Status'] || row['eligibility_status'] || 'Pending Verification';

      if (!placement_id || !name || !email || !course) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Missing required fields (Placement ID, Name, Email, Course).`);
        continue;
      }

      if (!validCourses.includes(course)) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Course "${course}" not in authorized programmes.`);
        continue;
      }

      // Check duplicate
      const duplicate = db.prepare('SELECT id FROM students WHERE placement_id = ? OR email = ?').get(placement_id, email);
      if (duplicate) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Duplicate placement_id (${placement_id}) or email (${email}). Skipped.`);
        continue;
      }

      try {
        insertStmt.run(
          placement_id.toUpperCase(),
          name,
          mobile,
          email.toLowerCase(),
          course,
          batch,
          cgpa,
          backlogs,
          regStatus,
          eligStatus,
          'Imported via CSV batch'
        );
        results.imported++;
      } catch (insertErr) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: ${insertErr.message}`);
      }
    }
  });

  try {
    importTransaction(records);

    logAudit(req, {
      action: 'IMPORT_STUDENTS_CSV',
      entityType: 'student',
      entityId: `imported_${results.imported}`,
      reason: `Batch imported ${results.imported} students (${results.skipped} skipped)`
    });

    res.json({
      success: true,
      results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: `Import failed: ${err.message}` });
  }
});

module.exports = router;
