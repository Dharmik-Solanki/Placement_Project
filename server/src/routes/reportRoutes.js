const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Helper to calculate exact median
function calculateMedian(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

// Comprehensive Dashboard Metrics & Placement Statistics
router.get('/dashboard', authenticateToken, (req, res) => {
  const { course, batch } = req.query;

  let studentFilter = 'WHERE is_archived = 0';
  let offerFilter = 'WHERE 1=1';
  const params = [];
  const offerParams = [];

  // Course coordinator scope
  if (req.user.role === 'coordinator' && req.user.assigned_course) {
    studentFilter += ' AND course = ?';
    params.push(req.user.assigned_course);
    offerFilter += ' AND s.course = ?';
    offerParams.push(req.user.assigned_course);
  } else if (course && course !== 'ALL') {
    studentFilter += ' AND course = ?';
    params.push(course);
    offerFilter += ' AND s.course = ?';
    offerParams.push(course);
  }

  if (batch) {
    studentFilter += ' AND batch = ?';
    params.push(batch);
    offerFilter += ' AND s.batch = ?';
    offerParams.push(batch);
  }

  // 1. Overall Student Registry Stats
  const studentTotals = db.prepare(`
    SELECT 
      COUNT(*) as total_students,
      SUM(CASE WHEN registration_status = 'Registered' THEN 1 ELSE 0 END) as registered_students,
      SUM(CASE WHEN registration_status = 'Deregistered' THEN 1 ELSE 0 END) as deregistered_students,
      SUM(CASE WHEN registration_status = 'Not Registered' THEN 1 ELSE 0 END) as not_registered_students,
      SUM(CASE WHEN eligibility_status = 'Eligible' THEN 1 ELSE 0 END) as eligible_students,
      SUM(CASE WHEN eligibility_status = 'Ineligible' THEN 1 ELSE 0 END) as ineligible_students,
      SUM(CASE WHEN eligibility_status = 'Pending Verification' THEN 1 ELSE 0 END) as pending_verification_students,
      SUM(CASE WHEN placement_status = 'Unplaced' THEN 1 ELSE 0 END) as unplaced_students,
      SUM(CASE WHEN placement_status != 'Unplaced' THEN 1 ELSE 0 END) as placed_students,
      SUM(CASE WHEN placement_status = 'Internship Only' THEN 1 ELSE 0 END) as internship_only_students,
      SUM(CASE WHEN placement_status = 'FTE Only' THEN 1 ELSE 0 END) as fte_only_students,
      SUM(CASE WHEN placement_status = 'Internship + PPO/FTE' THEN 1 ELSE 0 END) as internship_ppo_fte_students
    FROM students
    ${studentFilter}
  `).get(...params);

  // 2. Separate count of Unique Placed Students vs Total Offers Received
  const offerTotals = db.prepare(`
    SELECT 
      COUNT(*) as total_offers_received,
      COUNT(DISTINCT o.student_id) as students_with_offers,
      SUM(CASE WHEN o.offer_acceptance = 'Accepted' THEN 1 ELSE 0 END) as total_accepted_offers,
      SUM(CASE WHEN o.offer_acceptance = 'Pending' THEN 1 ELSE 0 END) as pending_acceptance_offers,
      SUM(CASE WHEN o.offer_acceptance = 'Declined' THEN 1 ELSE 0 END) as declined_offers,
      SUM(CASE WHEN o.offer_acceptance = 'Expired' THEN 1 ELSE 0 END) as expired_offers,
      SUM(CASE WHEN o.category = 'A+' THEN 1 ELSE 0 END) as category_a_plus_offers,
      SUM(CASE WHEN o.category = 'A' THEN 1 ELSE 0 END) as category_a_offers,
      SUM(CASE WHEN o.category = 'B' THEN 1 ELSE 0 END) as category_b_offers,
      SUM(CASE WHEN o.category = 'C' THEN 1 ELSE 0 END) as category_c_offers
    FROM offers o
    JOIN students s ON o.student_id = s.id
    ${offerFilter}
  `).get(...offerParams);

  // 3. Compensation Metrics (FTE Packages vs Internship Stipends)
  const ftePackages = db.prepare(`
    SELECT fte_package 
    FROM students 
    ${studentFilter} AND fte_package > 0 AND placement_status != 'Unplaced'
  `).all(...params).map(r => r.fte_package);

  const highestFte = ftePackages.length > 0 ? Math.max(...ftePackages) : 0;
  const avgFte = ftePackages.length > 0 ? (ftePackages.reduce((a, b) => a + b, 0) / ftePackages.length) : 0;
  const medianFte = calculateMedian(ftePackages);

  // Internship Stipend statistics
  const stipends = db.prepare(`
    SELECT internship_stipend 
    FROM students 
    ${studentFilter} AND internship_stipend > 0
  `).all(...params).map(r => r.internship_stipend);

  const highestStipend = stipends.length > 0 ? Math.max(...stipends) : 0;
  const avgStipend = stipends.length > 0 ? (stipends.reduce((a, b) => a + b, 0) / stipends.length) : 0;
  const medianStipend = calculateMedian(stipends);

  // 4. Course-wise Outcomes Breakdown (all 5 programmes)
  const courseStats = db.prepare(`
    SELECT 
      p.code as course_code,
      p.name as course_name,
      COUNT(s.id) as total_students,
      SUM(CASE WHEN s.placement_status != 'Unplaced' THEN 1 ELSE 0 END) as placed_students,
      SUM(CASE WHEN s.placement_status = 'Unplaced' THEN 1 ELSE 0 END) as unplaced_students,
      SUM(CASE WHEN s.placement_status = 'Internship Only' THEN 1 ELSE 0 END) as internship_only,
      SUM(CASE WHEN s.placement_status = 'FTE Only' THEN 1 ELSE 0 END) as fte_only,
      SUM(CASE WHEN s.placement_status = 'Internship + PPO/FTE' THEN 1 ELSE 0 END) as internship_ppo_fte,
      MAX(s.fte_package) as highest_package,
      AVG(CASE WHEN s.fte_package > 0 THEN s.fte_package ELSE NULL END) as avg_package
    FROM programmes p
    LEFT JOIN students s ON p.code = s.course AND s.is_archived = 0
    GROUP BY p.code, p.name
    ORDER BY p.code ASC
  `).all();

  // 5. Switching Eligibility Breakdown
  // Students currently eligible to switch to subsequent drives
  const switchingStats = db.prepare(`
    SELECT 
      SUM(CASE WHEN active_category = 'A' THEN 1 ELSE 0 END) as category_a_eligible_for_a_plus,
      SUM(CASE WHEN active_category = 'B' THEN 1 ELSE 0 END) as category_b_eligible_for_1_5x,
      SUM(CASE WHEN active_category = 'C' THEN 1 ELSE 0 END) as category_c_eligible_for_higher,
      SUM(CASE WHEN active_category = 'A+' THEN 1 ELSE 0 END) as category_a_plus_completed_no_switch
    FROM students
    ${studentFilter} AND placement_status != 'Unplaced'
  `).get(...params);

  // 6. Joining & Compliance Cases
  const pendingCases = db.prepare(`
    SELECT 
      SUM(CASE WHEN joining_status = 'Pending' AND placement_status != 'Unplaced' THEN 1 ELSE 0 END) as pending_joining,
      SUM(CASE WHEN joining_status = 'Joined' THEN 1 ELSE 0 END) as joined_count,
      SUM(CASE WHEN joining_status = 'Not Joined' THEN 1 ELSE 0 END) as not_joined_count,
      SUM(CASE WHEN noc_status = 'Pending' THEN 1 ELSE 0 END) as pending_noc
    FROM students
    ${studentFilter}
  `).get(...params);

  const policyViolationsCount = db.prepare(`
    SELECT 
      COUNT(*) as total_violations,
      SUM(CASE WHEN status = 'FLAGGED' THEN 1 ELSE 0 END) as pending_reviews
    FROM policy_violations
  `).get();

  res.json({
    success: true,
    summary: {
      studentTotals,
      offerTotals,
      compensation: {
        fte: {
          highest: parseFloat(highestFte.toFixed(2)),
          average: parseFloat(avgFte.toFixed(2)),
          median: parseFloat(medianFte.toFixed(2)),
          count: ftePackages.length
        },
        stipend: {
          highest: parseFloat(highestStipend.toFixed(2)),
          average: parseFloat(avgStipend.toFixed(2)),
          median: parseFloat(medianStipend.toFixed(2)),
          count: stipends.length
        }
      },
      switchingStats,
      pendingCases,
      policyViolationsCount
    },
    courseStats
  });
});

// Company-wise offers, categories, and compensation report
router.get('/company-report', authenticateToken, (req, res) => {
  const companyStats = db.prepare(`
    SELECT 
      o.company_name,
      o.category,
      o.offer_type,
      COUNT(o.id) as total_offers,
      COUNT(DISTINCT o.student_id) as unique_students,
      MAX(o.fte_package) as max_fte_package,
      AVG(CASE WHEN o.fte_package > 0 THEN o.fte_package ELSE NULL END) as avg_fte_package,
      MAX(o.internship_stipend) as max_stipend
    FROM offers o
    GROUP BY o.company_name, o.category, o.offer_type
    ORDER BY max_fte_package DESC, total_offers DESC
  `).all();

  res.json({ success: true, companyStats });
});

module.exports = router;
