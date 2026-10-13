const { db } = require('../database/db');

/**
 * Records an immutable audit log entry in SQLite
 */
function logAudit(req, { action, entityType, entityId = null, beforeState = null, afterState = null, reason = null }) {
  try {
    const userId = req && req.user ? req.user.id : null;
    const username = req && req.user ? req.user.username : 'SYSTEM';
    const userRole = req && req.user ? req.user.role : 'SYSTEM';
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';

    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        user_id, username, user_role, action, entity_type, entity_id,
        before_state, after_state, ip_address, reason, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      userId,
      username,
      userRole,
      action,
      entityType,
      entityId ? String(entityId) : null,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null,
      ipAddress,
      reason
    );
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = {
  logAudit
};
