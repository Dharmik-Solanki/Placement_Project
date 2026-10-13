const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nfsu-placement-secure-session-key-2026-27';

/**
 * Verifies JWT token and binds authenticated user to request
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired session token.'
      });
    }
    req.user = user;
    next();
  });
}

/**
 * Role-Based Access Control middleware
 * @param  {...string} roles Allowed roles ('admin', 'officer', 'coordinator', 'company', 'student')
 */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of: ${roles.join(', ')}. Your role: ${req.user ? req.user.role : 'unauthenticated'}.`
      });
    }
    next();
  };
}

/**
 * Masks sensitive contact information (e.g. mobile number) for privacy compliance
 * Admins and Placement Officers can see raw contact info.
 * Coordinators see contact info for their own course.
 * Recruiters and students see masked contact info.
 */
function maskStudentPII(student, userRole, assignedCourse = null) {
  if (!student) return student;

  const copy = { ...student };

  // Full access roles
  if (userRole === 'admin' || userRole === 'officer') {
    return copy;
  }

  // Course Coordinator has full access only to their assigned course
  if (userRole === 'coordinator' && assignedCourse && student.course === assignedCourse) {
    return copy;
  }

  // Mask mobile number: e.g., +91 9876543210 -> +91 ******3210
  if (copy.mobile && copy.mobile.length >= 4) {
    const raw = copy.mobile.replace(/\s+/g, '');
    const visibleSuffix = raw.slice(-4);
    copy.mobile = `+91 ******${visibleSuffix}`;
  }

  // If role is company/recruiter, hide private remarks
  if (userRole === 'company') {
    delete copy.remarks;
    delete copy.drives_banned_remaining;
  }

  return copy;
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  authorizeRoles,
  maskStudentPII
};
