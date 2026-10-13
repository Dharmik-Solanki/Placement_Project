const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { determineCategory, evaluateEligibility } = require('../policy/policyEngine');

// Interactive Policy Rule Simulator
router.post('/simulate', authenticateToken, (req, res) => {
  const { student_id, mock_student, target_drive } = req.body;

  let student = null;
  let offers = [];

  if (student_id) {
    student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }
    offers = db.prepare('SELECT * FROM offers WHERE student_id = ?').all(student_id);
  } else if (mock_student) {
    student = mock_student;
  } else {
    return res.status(400).json({ success: false, error: 'Provide either student_id or mock_student details.' });
  }

  if (!target_drive || !target_drive.offer_type) {
    return res.status(400).json({ success: false, error: 'Target drive details including offer_type are required.' });
  }

  // Derive target category if not explicitly provided
  const ftePackage = parseFloat(target_drive.fte_package) || 0;
  const category = target_drive.category || determineCategory(ftePackage);

  const evaluation = evaluateEligibility(student, {
    ...target_drive,
    category
  }, offers);

  res.json({
    success: true,
    student: {
      placement_id: student.placement_id,
      name: student.name,
      course: student.course,
      cgpa: student.cgpa,
      backlogs: student.backlogs,
      registration_status: student.registration_status,
      eligibility_status: student.eligibility_status,
      placement_status: student.placement_status,
      active_company: student.active_company,
      active_offer_type: student.active_offer_type,
      active_category: student.active_category,
      fte_package: student.fte_package,
      drives_banned_remaining: student.drives_banned_remaining
    },
    targetDrive: {
      ...target_drive,
      category
    },
    evaluation
  });
});

// List policy violations and compliance review queue
router.get('/violations', authenticateToken, authorizeRoles('admin', 'officer'), (req, res) => {
  const { status, violation_type } = req.query;

  let query = `
    SELECT v.*, s.name as student_name, s.placement_id, s.course, s.email,
           d.company_name, d.drive_code, u.username as reviewer_username
    FROM policy_violations v
    JOIN students s ON v.student_id = s.id
    LEFT JOIN drives d ON v.drive_id = d.id
    LEFT JOIN users u ON v.reviewed_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'ALL') {
    query += ' AND v.status = ?';
    params.push(status);
  }

  if (violation_type && violation_type !== 'ALL') {
    query += ' AND v.violation_type = ?';
    params.push(violation_type);
  }

  query += ' ORDER BY v.timestamp DESC';

  const violations = db.prepare(query).all(...params);

  res.json({ success: true, violations });
});

// Update violation review state
router.patch('/violations/:id', authenticateToken, authorizeRoles('admin', 'officer'), (req, res) => {
  const { id } = req.params;
  const { status, action_taken } = req.body;

  if (!['FLAGGED', 'UNDER_REVIEW', 'WAIVED', 'PENALTY_ENFORCED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid violation status.' });
  }

  const violation = db.prepare('SELECT * FROM policy_violations WHERE id = ?').get(id);
  if (!violation) {
    return res.status(404).json({ success: false, error: 'Violation record not found.' });
  }

  db.prepare(`
    UPDATE policy_violations 
    SET status = ?, action_taken = ?, reviewed_by = ?, timestamp = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(status, action_taken || '', req.user.id, id);

  // If penalty enforced or waived, handle bans
  if (status === 'WAIVED') {
    db.prepare('UPDATE students SET drives_banned_remaining = 0 WHERE id = ?').run(violation.student_id);
  }

  logAudit(req, {
    action: `POLICY_VIOLATION_${status}`,
    entityType: 'policy_violation',
    entityId: id,
    beforeState: { status: violation.status },
    afterState: { status, action_taken },
    reason: `Reviewed policy violation #${id}: ${action_taken || status}`
  });

  res.json({ success: true, message: `Violation status updated to ${status}.` });
});

// Fetch system guidelines and parameters
router.get('/guidelines', authenticateToken, (req, res) => {
  const settings = db.prepare('SELECT * FROM system_settings').all();
  const programmes = db.prepare('SELECT * FROM programmes').all();

  res.json({
    success: true,
    guidelines: {
      session: '2026-27',
      institution: 'National Forensic Sciences University (NFSU)',
      categories: [
        { code: 'A+', ctc: '≥ ₹16 LPA', rule: 'No switching policy; students selected in A+ are out of the placement process.' },
        { code: 'A', ctc: '₹10–16 LPA', rule: 'Switching allowed only to A+ category companies.' },
        { code: 'B', ctc: '₹6–10 LPA', rule: 'Further placement allowed where the new package is at least 1.5 times the existing package.' },
        { code: 'C', ctc: 'Below ₹6 LPA', rule: 'Eligible for higher-category opportunities as described in policy.' }
      ],
      offerTypes: [
        { type: 'Internship only (I)', rule: 'Cannot apply for another internship-only role; may apply for FTE or I+F roles subject to category rules.' },
        { type: 'FTE only (F)', rule: 'Cannot apply for another FTE-only role; may apply for an internship role subject to policy.' },
        { type: 'Internship + PPO/FTE (I+F)', rule: 'After selection, cannot participate in other I, F, or I+F roles at another organization.' }
      ],
      absenteeismPolicy: 'Unexcused absenteeism flags exclusion from the next three recruitment drives, subject to authorized emergency waiver.',
      acceptanceDeadline: 'Offers must be accepted within 24 hours or the company’s stated timeline, whichever is earlier.',
      settings,
      programmes
    }
  });
});

module.exports = router;
