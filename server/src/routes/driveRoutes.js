const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles, maskStudentPII } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { determineCategory, evaluateEligibility } = require('../policy/policyEngine');

// List drives
router.get('/', authenticateToken, (req, res) => {
  const { status, category, offer_type } = req.query;

  let query = 'SELECT * FROM drives WHERE 1=1';
  const params = [];

  // Recruiter can only see drives for their own company
  if (req.user.role === 'company' && req.user.company_name) {
    query += ' AND company_name = ?';
    params.push(req.user.company_name);
  }

  if (status && status !== 'ALL') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (category && category !== 'ALL') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (offer_type && offer_type !== 'ALL') {
    query += ' AND offer_type = ?';
    params.push(offer_type);
  }

  query += ' ORDER BY drive_date DESC, id DESC';

  const drives = db.prepare(query).all(...params);

  // Attach applicant counts and offers count
  const enrichedDrives = drives.map(d => {
    const offerStats = db.prepare(`
      SELECT 
        COUNT(*) as total_offers,
        SUM(CASE WHEN offer_acceptance = 'Accepted' THEN 1 ELSE 0 END) as accepted_offers,
        SUM(CASE WHEN offer_acceptance = 'Pending' THEN 1 ELSE 0 END) as pending_offers
      FROM offers WHERE drive_id = ?
    `).get(d.id);

    return {
      ...d,
      eligible_courses: typeof d.eligible_courses === 'string' ? JSON.parse(d.eligible_courses) : d.eligible_courses,
      stats: offerStats
    };
  });

  res.json({ success: true, drives: enrichedDrives });
});

// Get single drive details
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const drive = db.prepare('SELECT * FROM drives WHERE id = ?').get(id);

  if (!drive) {
    return res.status(404).json({ success: false, error: 'Recruitment drive not found.' });
  }

  // Recruiter authorization check
  if (req.user.role === 'company' && req.user.company_name && drive.company_name !== req.user.company_name) {
    return res.status(403).json({ success: false, error: 'Access denied to other company drives.' });
  }

  drive.eligible_courses = typeof drive.eligible_courses === 'string' ? JSON.parse(drive.eligible_courses) : drive.eligible_courses;

  // Fetch offers for this drive
  const offers = db.prepare(`
    SELECT o.*, s.name as student_name, s.placement_id, s.course, s.cgpa, s.email, s.mobile
    FROM offers o
    JOIN students s ON o.student_id = s.id
    WHERE o.drive_id = ?
    ORDER BY o.offer_date DESC
  `).all(id);

  const maskedOffers = offers.map(o => {
    const studentInfo = maskStudentPII({
      mobile: o.mobile,
      email: o.email,
      course: o.course
    }, req.user.role, req.user.assigned_course);

    return {
      ...o,
      mobile: studentInfo.mobile,
      email: studentInfo.email
    };
  });

  res.json({ success: true, drive, offers: maskedOffers });
});

// Check eligibility of all students for this specific drive (Policy Rule Engine integration)
router.get('/:id/candidates-eligibility', authenticateToken, (req, res) => {
  const { id } = req.params;
  const drive = db.prepare('SELECT * FROM drives WHERE id = ?').get(id);

  if (!drive) {
    return res.status(404).json({ success: false, error: 'Drive not found.' });
  }

  drive.eligible_courses = typeof drive.eligible_courses === 'string' ? JSON.parse(drive.eligible_courses) : drive.eligible_courses;

  let query = 'SELECT * FROM students WHERE is_archived = 0';
  const params = [];

  // Scoped to coordinator if coordinator role
  if (req.user.role === 'coordinator' && req.user.assigned_course) {
    query += ' AND course = ?';
    params.push(req.user.assigned_course);
  }

  const students = db.prepare(query).all(...params);

  // Evaluate each student against this drive using Policy Engine
  const evaluations = students.map(student => {
    const existingOffers = db.prepare('SELECT * FROM offers WHERE student_id = ?').all(student.id);
    const policyResult = evaluateEligibility(student, drive, existingOffers);
    
    return {
      student: maskStudentPII(student, req.user.role, req.user.assigned_course),
      evaluation: policyResult
    };
  });

  res.json({
    success: true,
    drive_id: id,
    company_name: drive.company_name,
    total_evaluated: evaluations.length,
    eligible_count: evaluations.filter(e => e.evaluation.allowed).length,
    blocked_count: evaluations.filter(e => e.evaluation.status === 'BLOCKED').length,
    review_count: evaluations.filter(e => e.evaluation.status === 'FLAGGED_FOR_REVIEW').length,
    evaluations
  });
});

// Create drive (Admin, Officer)
router.post('/', authenticateToken, authorizeRoles('admin', 'officer'), (req, res) => {
  const {
    drive_code,
    company_name,
    offer_type,
    fte_package = 0.0,
    internship_stipend = 0.0,
    internship_duration = '',
    min_cgpa = 6.0,
    max_backlogs = 0,
    eligible_courses = [],
    batch = '2025-27',
    drive_date,
    acceptance_deadline_hours = 24,
    description = ''
  } = req.body;

  if (!drive_code || !company_name || !offer_type || !drive_date) {
    return res.status(400).json({ success: false, error: 'Drive code, Company name, Offer type, and Drive date are required.' });
  }

  const category = determineCategory(fte_package);

  try {
    const stmt = db.prepare(`
      INSERT INTO drives (
        drive_code, company_name, category, offer_type, fte_package,
        internship_stipend, internship_duration, min_cgpa, max_backlogs,
        eligible_courses, batch, drive_date, acceptance_deadline_hours, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      drive_code.trim().toUpperCase(),
      company_name.trim(),
      category,
      offer_type,
      parseFloat(fte_package) || 0.0,
      parseFloat(internship_stipend) || 0.0,
      internship_duration,
      parseFloat(min_cgpa) || 6.0,
      parseInt(max_backlogs, 10) || 0,
      JSON.stringify(eligible_courses),
      batch,
      drive_date,
      parseInt(acceptance_deadline_hours, 10) || 24,
      description
    );

    const newDrive = db.prepare('SELECT * FROM drives WHERE id = ?').get(result.lastInsertRowid);

    logAudit(req, {
      action: 'DRIVE_CREATE',
      entityType: 'drive',
      entityId: newDrive.id,
      afterState: newDrive,
      reason: `Created drive ${newDrive.drive_code} for ${newDrive.company_name} (Category ${category})`
    });

    res.status(201).json({ success: true, drive: newDrive });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update drive status
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'officer'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Upcoming', 'Ongoing', 'Completed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid drive status.' });
  }

  db.prepare('UPDATE drives SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

  logAudit(req, {
    action: 'DRIVE_STATUS_UPDATE',
    entityType: 'drive',
    entityId: id,
    afterState: { status },
    reason: `Updated drive status to ${status}`
  });

  res.json({ success: true, message: `Drive status updated to ${status}` });
});

module.exports = router;
