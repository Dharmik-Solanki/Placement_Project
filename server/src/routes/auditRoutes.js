const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// List audit logs (Admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { action, entity_type, entity_id, username, page = 1, limit = 50 } = req.query;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (action && action !== 'ALL') {
    query += ' AND action = ?';
    params.push(action);
  }

  if (entity_type && entity_type !== 'ALL') {
    query += ' AND entity_type = ?';
    params.push(entity_type);
  }

  if (entity_id) {
    query += ' AND entity_id = ?';
    params.push(entity_id);
  }

  if (username) {
    query += ' AND username LIKE ?';
    params.push(`%${username}%`);
  }

  query += ' ORDER BY id DESC';

  const countQuery = query.replace('SELECT * FROM', 'SELECT COUNT(*) as total FROM');
  const total = db.prepare(countQuery).get(...params).total;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), offset);

  const logs = db.prepare(query).all(...params);

  // Parse before/after json
  const formattedLogs = logs.map(l => ({
    ...l,
    before_state: l.before_state ? JSON.parse(l.before_state) : null,
    after_state: l.after_state ? JSON.parse(l.after_state) : null
  }));

  res.json({
    success: true,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    logs: formattedLogs
  });
});

module.exports = router;
