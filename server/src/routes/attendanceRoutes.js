const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Record recruitment activity attendance (Admin, Officer)
router.post('/record', authenticateToken, authorizeRoles('admin', 'officer'), (req, res) => {
  const { drive_id, student_id, activity_type, status, excuse_reason } = req.body;

  if (!drive_id || !student_id || !activity_type || !status) {
    return res.status(400).json({ success: false, error: 'Drive ID, Student ID, Activity type, and Status are required.' });
  }

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  const drive = db.prepare('SELECT * FROM drives WHERE id = ?').get(drive_id);

  if (!student || !drive) {
    return res.status(404).json({ success: false, error: 'Student or Recruitment Drive not found.' });
  }

  const attendanceTransaction = db.transaction(() => {
    // Record attendance event
    const stmt = db.prepare(`
      INSERT INTO drive_attendance (
        drive_id, student_id, activity_type, status, excuse_reason,
        excuse_approved, recorded_by, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const isExcused = status === 'Excused' ? 1 : 0;
    stmt.run(drive_id, student_id, activity_type, status, excuse_reason || null, isExcused, req.user.id);

    // If student is marked ABSENT without approved excuse:
    // Apply NFSU policy: Flag absenteeism for exclusion from the next three drives (drives_banned_remaining = 3)
    if (status === 'Absent') {
      const banCount = 3;
      db.prepare(`
        UPDATE students 
        SET drives_banned_remaining = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(banCount, student_id);

      db.prepare(`
        INSERT INTO policy_violations (
          student_id, drive_id, violation_type, description, status, timestamp
        ) VALUES (?, ?, 'ABSENTEEISM', ?, 'FLAGGED', CURRENT_TIMESTAMP)
      `).run(
        student_id,
        drive_id,
        `Unexcused absenteeism during ${activity_type} for ${drive.company_name}. Banned from next ${banCount} recruitment drives.`
      );
    }
  });

  try {
    attendanceTransaction();

    logAudit(req, {
      action: 'ATTENDANCE_RECORDED',
      entityType: 'attendance',
      entityId: `${drive_id}_${student_id}`,
      reason: `Recorded ${status} for ${student.name} at ${drive.company_name} (${activity_type})`
    });

    res.json({
      success: true,
      message: status === 'Absent'
        ? `Marked absent. Student penalized with 3-drive exclusion under NFSU placement policy.`
        : `Attendance recorded as ${status}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Grant emergency exception waiver (Admin, Officer)
router.post('/emergency-waiver', authenticateToken, authorizeRoles('admin', 'officer'), (req, res) => {
  const { student_id, violation_id, excuse_reason } = req.body;

  if (!student_id || !excuse_reason) {
    return res.status(400).json({ success: false, error: 'Student ID and documented excuse reason are required.' });
  }

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  const waiverTransaction = db.transaction(() => {
    // Reset ban counter
    db.prepare('UPDATE students SET drives_banned_remaining = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(student_id);

    // Mark violation as WAIVED
    if (violation_id) {
      db.prepare(`
        UPDATE policy_violations 
        SET status = 'WAIVED', action_taken = ?, reviewed_by = ?, timestamp = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(`Emergency waiver approved: ${excuse_reason}`, req.user.id, violation_id);
    } else {
      db.prepare(`
        UPDATE policy_violations 
        SET status = 'WAIVED', action_taken = ?, reviewed_by = ?, timestamp = CURRENT_TIMESTAMP 
        WHERE student_id = ? AND violation_type = 'ABSENTEEISM' AND status = 'FLAGGED'
      `).run(`Emergency waiver approved: ${excuse_reason}`, req.user.id, student_id);
    }
  });

  try {
    waiverTransaction();

    logAudit(req, {
      action: 'EMERGENCY_EXCEPTION_WAIVER',
      entityType: 'policy_violation',
      entityId: student_id,
      reason: `Approved emergency absenteeism waiver for ${student.name}: ${excuse_reason}`
    });

    res.json({ success: true, message: 'Emergency exception approved. 3-drive ban successfully cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List attendance for a specific drive
router.get('/drive/:driveId', authenticateToken, (req, res) => {
  const { driveId } = req.params;

  const records = db.prepare(`
    SELECT a.*, s.name as student_name, s.placement_id, s.course, s.drives_banned_remaining, u.username as recorded_by_user
    FROM drive_attendance a
    JOIN students s ON a.student_id = s.id
    LEFT JOIN users u ON a.recorded_by = u.id
    WHERE a.drive_id = ?
    ORDER BY a.timestamp DESC
  `).all(driveId);

  res.json({ success: true, records });
});

module.exports = router;
