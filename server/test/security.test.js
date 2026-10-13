process.env.NODE_ENV = 'test';
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const { JWT_SECRET, maskStudentPII } = require('../src/middleware/auth');
const { db } = require('../src/database/db');

describe('Security and Cybersecurity Control Tests', () => {

  const adminToken = jwt.sign(
    { id: 1, username: 'admin', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const studentToken = jwt.sign(
    { id: 10, username: 'student_arjun', role: 'student', student_id: 1 },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const coordinatorToken = jwt.sign(
    { id: 3, username: 'coord_dfis', role: 'coordinator', assigned_course: 'M.Sc. DFIS' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  before(() => {
    db.prepare(`
      INSERT OR IGNORE INTO students (
        id, placement_id, name, mobile, email, course, batch, cgpa, backlogs,
        registration_status, eligibility_status, placement_status
      ) VALUES (1, 'NFSU/TEST/001', 'Arjun Mehta', '+91 9876501001', 'arjun@nfsu.ac.in', 'M.Sc. DFIS', '2025-27', 9.0, 0, 'Registered', 'Eligible', 'Unplaced')
    `).run();

    db.prepare(`
      INSERT OR IGNORE INTO students (
        id, placement_id, name, mobile, email, course, batch, cgpa, backlogs,
        registration_status, eligibility_status, placement_status
      ) VALUES (2, 'NFSU/TEST/002', 'Sneha Nair', '+91 9876501002', 'sneha@nfsu.ac.in', 'M.Sc. DFIS', '2025-27', 9.2, 0, 'Registered', 'Eligible', 'Unplaced')
    `).run();
  });

  describe('Authentication and RBAC', () => {
    it('should reject unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/students');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('should block non-admin roles from accessing audit logs with 403', async () => {
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${studentToken}`);
      assert.equal(res.status, 403);
    });

    it('should allow admin role to access audit logs with 200', async () => {
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.logs));
    });
  });

  describe('IDOR & Horizontal Privilege Escalation Protection', () => {
    it('should prevent student from accessing another student record (IDOR defense)', async () => {
      // Student has student_id: 1, attempts to fetch student_id: 2
      const res = await request(app)
        .get('/api/students/2')
        .set('Authorization', `Bearer ${studentToken}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('Access denied'));
    });

    it('should allow student to access their own record', async () => {
      const res = await request(app)
        .get('/api/students/1')
        .set('Authorization', `Bearer ${studentToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.student.id, 1);
    });

    it('should prevent student from modifying placement status or packages', async () => {
      const res = await request(app)
        .put('/api/students/1')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ fte_package: 50.0, placement_status: 'Internship + PPO/FTE' });
      assert.equal(res.status, 403); // Student role not in authorized roles for updates
    });
  });

  describe('PII Masking and Confidentiality', () => {
    it('should mask mobile number for non-admin and recruiter roles', () => {
      const sample = {
        name: 'Arjun Mehta',
        mobile: '+91 9876501001',
        email: 'arjun@nfsu.ac.in',
        course: 'M.Sc. DFIS',
        remarks: 'Secret notes'
      };

      const maskedForRecruiter = maskStudentPII(sample, 'company');
      assert.equal(maskedForRecruiter.mobile, '+91 ******1001');
      assert.equal(maskedForRecruiter.remarks, undefined); // Remarks removed

      const unmaskedForAdmin = maskStudentPII(sample, 'admin');
      assert.equal(unmaskedForAdmin.mobile, '+91 9876501001');
      assert.equal(unmaskedForAdmin.remarks, 'Secret notes');
    });
  });

  describe('SQL Injection Resistance', () => {
    it('should safely handle malicious SQL injection payloads in search queries', async () => {
      const maliciousPayload = "'; DROP TABLE students; --";
      const res = await request(app)
        .get(`/api/students?search=${encodeURIComponent(maliciousPayload)}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);

      // Verify students table still exists and is untouched
      const count = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
      assert.ok(count > 0);
    });
  });
});
