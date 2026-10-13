const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles, maskStudentPII } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { determineCategory, evaluateEligibility } = require('../policy/policyEngine');

// List all offers with filters
router.get('/', authenticateToken, (req, res) => {
  const { student_id, drive_id, category, offer_type, offer_acceptance, joining_status } = req.query;

  let query = `
    SELECT o.*, s.name as student_name, s.placement_id, s.course, s.batch, s.email, s.mobile,
           d.drive_code, d.company_name as drive_company_name
    FROM offers o
    JOIN students s ON o.student_id = s.id
    LEFT JOIN drives d ON o.drive_id = d.id
    WHERE 1=1
  `;
  const params = [];

  // Scoped permissions:
  if (req.user.role === 'student') {
    query += ' AND o.student_id = ?';
    params.push(req.user.student_id);
  } else if (req.user.role === 'coordinator' && req.user.assigned_course) {
    query += ' AND s.course = ?';
    params.push(req.user.assigned_course);
  } else if (req.user.role === 'company' && req.user.company_name) {
    query += ' AND o.company_name = ?';
    params.push(req.user.company_name);
  }

  if (student_id) {
    query += ' AND o.student_id = ?';
    params.push(student_id);
  }

  if (drive_id) {
    query += ' AND o.drive_id = ?';
    params.push(drive_id);
  }

  if (category && category !== 'ALL') {
    query += ' AND o.category = ?';
    params.push(category);
  }

  if (offer_type && offer_type !== 'ALL') {
    query += ' AND o.offer_type = ?';
    params.push(offer_type);
  }

  if (offer_acceptance && offer_acceptance !== 'ALL') {
    query += ' AND o.offer_acceptance = ?';
    params.push(offer_acceptance);
  }

  if (joining_status && joining_status !== 'ALL') {
    query += ' AND o.joining_status = ?';
    params.push(joining_status);
  }

  query += ' ORDER BY o.offer_date DESC, o.id DESC';

  const offers = db.prepare(query).all(...params);

  // Check and update expired pending offers (24-hour deadline check)
  const now = new Date();
  const processedOffers = offers.map(o => {
    let acceptance = o.offer_acceptance;
    if (acceptance === 'Pending' && new Date(o.acceptance_deadline) < now) {
      acceptance = 'Expired';
      db.prepare("UPDATE offers SET offer_acceptance = 'Expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(o.id);
    }

    const maskedStudent = maskStudentPII({
      mobile: o.mobile,
      email: o.email,
      course: o.course
    }, req.user.role, req.user.assigned_course);

    return {
      ...o,
      offer_acceptance: acceptance,
      mobile: maskedStudent.mobile,
      email: maskedStudent.email
    };
  });

  res.json({ success: true, offers: processedOffers });
});

// Create an offer (Placement Admin, Officer, or Recruiter for their drive)
router.post('/', authenticateToken, authorizeRoles('admin', 'officer', 'company'), (req, res) => {
  const {
    student_id,
    drive_id,
    company_name,
    offer_type, // 'I', 'F', 'I+F'
    fte_package = 0.0,
    internship_stipend = 0.0,
    internship_period = '',
    ppo_status = 'N/A',
    is_off_campus = 0,
    noc_required = 0,
    acceptance_deadline_hours = 24,
    remarks = '',
    force_override = false // Admin manual policy override
  } = req.body;

  if (!student_id || !company_name || !offer_type) {
    return res.status(400).json({ success: false, error: 'Student ID, Company name, and Offer type are required.' });
  }

  // Recruiter can only create offers for their own company
  if (req.user.role === 'company' && req.user.company_name && company_name !== req.user.company_name) {
    return res.status(403).json({ success: false, error: 'Recruiters can only issue offers for their own company.' });
  }

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student record not found.' });
  }

  const category = determineCategory(fte_package);

  // Evaluate NFSU Policy Rules before issuing offer
  const existingOffers = db.prepare('SELECT * FROM offers WHERE student_id = ?').all(student_id);
  const targetDriveMock = {
    category,
    offer_type,
    fte_package,
    min_cgpa: student.cgpa,
    max_backlogs: student.backlogs,
    eligible_courses: [student.course]
  };

  const policyEvaluation = evaluateEligibility(student, targetDriveMock, existingOffers);

  // If policy blocked and not authorized admin override:
  if (!policyEvaluation.allowed && !force_override) {
    // Record violation in policy violations queue
    db.prepare(`
      INSERT INTO policy_violations (
        student_id, drive_id, violation_type, description, status, timestamp
      ) VALUES (?, ?, 'UNAUTHORIZED_SWITCHING', ?, 'FLAGGED', CURRENT_TIMESTAMP)
    `).run(
      student_id,
      drive_id || null,
      `Attempted offer from ${company_name} (${offer_type}, ₹${fte_package} LPA): ${policyEvaluation.reasons.join('; ')}`
    );

    return res.status(422).json({
      success: false,
      error: 'Offer violates NFSU Student Placement Policy Guidelines 2026-27.',
      policyEvaluation
    });
  }

  // If override used, require admin role and log explicitly
  if (!policyEvaluation.allowed && force_override) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only Placement Administrator can perform manual policy override.' });
    }
  }

  // Compute 24-hour deadline or stated deadline
  const deadlineDate = new Date(Date.now() + (parseInt(acceptance_deadline_hours, 10) || 24) * 60 * 60 * 1000).toISOString();
  const offerDate = new Date().toISOString().split('T')[0];

  try {
    const insertOffer = db.prepare(`
      INSERT INTO offers (
        student_id, drive_id, company_name, category, offer_type,
        fte_package, internship_stipend, internship_period, ppo_status,
        offer_acceptance, joining_status, offer_date, acceptance_deadline,
        is_off_campus, noc_required, noc_status, remarks, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = insertOffer.run(
      student_id,
      drive_id || null,
      company_name.trim(),
      category,
      offer_type,
      parseFloat(fte_package) || 0.0,
      parseFloat(internship_stipend) || 0.0,
      internship_period,
      ppo_status,
      offerDate,
      deadlineDate,
      is_off_campus ? 1 : 0,
      noc_required ? 1 : 0,
      noc_required ? 'Pending' : 'N/A',
      remarks + (force_override ? ` [ADMIN_POLICY_OVERRIDE: ${req.user.username}]` : '')
    );

    const newOffer = db.prepare('SELECT * FROM offers WHERE id = ?').get(result.lastInsertRowid);

    logAudit(req, {
      action: force_override ? 'OFFER_CREATE_OVERRIDE' : 'OFFER_CREATE',
      entityType: 'offer',
      entityId: newOffer.id,
      afterState: newOffer,
      reason: `Issued ${offer_type} offer for ${student.name} (${student.placement_id}) from ${company_name} at ₹${fte_package} LPA`
    });

    res.status(201).json({
      success: true,
      offer: newOffer,
      policyEvaluation
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update offer acceptance (Student accepts/declines their offer, or Admin/Officer updates)
router.patch('/:id/acceptance', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { acceptance, reason = '' } = req.body; // 'Accepted', 'Declined'

  if (!['Accepted', 'Declined'].includes(acceptance)) {
    return res.status(400).json({ success: false, error: 'Status must be Accepted or Declined.' });
  }

  const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
  if (!offer) {
    return res.status(404).json({ success: false, error: 'Offer not found.' });
  }

  // Student permission check: student can only accept/decline their OWN offer
  if (req.user.role === 'student' && req.user.student_id !== offer.student_id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to modify another student’s offer.' });
  }

  // Check 24-hour deadline
  const now = new Date();
  if (new Date(offer.acceptance_deadline) < now && offer.offer_acceptance === 'Pending') {
    db.prepare("UPDATE offers SET offer_acceptance = 'Expired' WHERE id = ?").run(id);
    return res.status(400).json({ success: false, error: 'The acceptance window (24 hours) for this offer has expired.' });
  }

  // Execute acceptance or decline in a database transaction
  const updateTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE offers 
      SET offer_acceptance = ?, remarks = remarks || ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(acceptance, reason ? ` [Status change: ${acceptance} - ${reason}]` : '', id);

    // If student ACCEPTED, update the active placement record in `students`
    if (acceptance === 'Accepted') {
      let newPlacementStatus = 'Unplaced';
      if (offer.offer_type === 'I+F') {
        newPlacementStatus = 'Internship + PPO/FTE';
      } else if (offer.offer_type === 'I') {
        newPlacementStatus = 'Internship Only';
      } else if (offer.offer_type === 'F') {
        newPlacementStatus = 'FTE Only';
      }

      db.prepare(`
        UPDATE students SET
          placement_status = ?,
          active_company = ?,
          active_offer_type = ?,
          active_category = ?,
          internship_stipend = ?,
          internship_period = ?,
          fte_package = ?,
          ppo_status = ?,
          offer_acceptance = 'Accepted',
          offer_date = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        newPlacementStatus,
        offer.company_name,
        offer.offer_type,
        offer.category,
        offer.internship_stipend,
        offer.internship_period,
        offer.fte_package,
        offer.ppo_status,
        offer.offer_date,
        offer.student_id
      );
    }
  });

  try {
    updateTransaction();

    const updatedOffer = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);

    logAudit(req, {
      action: `OFFER_${acceptance.toUpperCase()}`,
      entityType: 'offer',
      entityId: id,
      beforeState: { offer_acceptance: offer.offer_acceptance },
      afterState: { offer_acceptance: acceptance },
      reason: `Offer ${acceptance} by ${req.user.username} (${req.user.role}): ${reason}`
    });

    res.json({ success: true, offer: updatedOffer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Joining Status & NOC Status (Admin, Officer)
router.patch('/:id/joining-noc', authenticateToken, authorizeRoles('admin', 'officer'), (req, res) => {
  const { id } = req.params;
  const { joining_status, noc_status, remarks } = req.body;

  const current = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
  if (!current) {
    return res.status(404).json({ success: false, error: 'Offer not found.' });
  }

  db.prepare(`
    UPDATE offers SET
      joining_status = COALESCE(?, joining_status),
      noc_status = COALESCE(?, noc_status),
      remarks = COALESCE(?, remarks),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(joining_status, noc_status, remarks, id);

  // Sync back to student table if this is the active offer
  if (joining_status) {
    db.prepare('UPDATE students SET joining_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(joining_status, current.student_id);
  }
  if (noc_status) {
    db.prepare('UPDATE students SET noc_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(noc_status, current.student_id);
  }

  const updated = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);

  logAudit(req, {
    action: 'OFFER_JOINING_NOC_UPDATE',
    entityType: 'offer',
    entityId: id,
    beforeState: current,
    afterState: updated,
    reason: 'Updated joining / NOC status'
  });

  res.json({ success: true, offer: updated });
});

module.exports = router;
