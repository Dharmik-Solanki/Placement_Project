const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Login endpoint
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username/email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logAudit(req, {
      action: 'LOGIN_FAILURE',
      entityType: 'user',
      entityId: username,
      reason: 'Invalid credentials attempted'
    });
    return res.status(401).json({ success: false, error: 'Invalid username/email or password.' });
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    assigned_course: user.assigned_course,
    company_name: user.company_name,
    student_id: user.student_id
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

  logAudit({ user, headers: req.headers, socket: req.socket }, {
    action: 'LOGIN_SUCCESS',
    entityType: 'user',
    entityId: user.id,
    reason: `Authenticated as ${user.role}`
  });

  res.json({
    success: true,
    token,
    user: tokenPayload
  });
});

// Current user profile
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.assigned_course, u.company_name, u.student_id, u.mfa_enabled,
           s.placement_id, s.name as student_name, s.course as student_course, s.placement_status
    FROM users u
    LEFT JOIN students s ON u.student_id = s.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  res.json({ success: true, user });
});

// Quick Role Switcher for seamless evaluation & demoing all 5 personas
router.post('/demo-switch', (req, res) => {
  const { role, course, company } = req.body;

  let query = 'SELECT * FROM users WHERE role = ?';
  const params = [role];

  if (role === 'coordinator' && course) {
    query += ' AND assigned_course = ?';
    params.push(course);
  } else if (role === 'company' && company) {
    query += ' AND company_name = ?';
    params.push(company);
  }

  query += ' LIMIT 1';

  let user = db.prepare(query).get(...params);

  // If specific coordinator or student not found, pick first for that role
  if (!user) {
    user = db.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get(role);
  }

  if (!user) {
    return res.status(404).json({ success: false, error: `No demo account available for role: ${role}` });
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    assigned_course: user.assigned_course,
    company_name: user.company_name,
    student_id: user.student_id
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

  logAudit({ user, headers: req.headers, socket: req.socket }, {
    action: 'DEMO_ROLE_SWITCH',
    entityType: 'user',
    entityId: user.id,
    reason: `Demo switched to ${user.role} (${user.username})`
  });

  res.json({
    success: true,
    token,
    user: tokenPayload
  });
});

module.exports = router;
