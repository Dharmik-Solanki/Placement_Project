const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { determineCategory, evaluateEligibility } = require('../src/policy/policyEngine');

describe('NFSU Placement Policy Rule Engine (2026-27 Guidelines)', () => {

  describe('Category CTC Classification', () => {
    it('should classify >= 16 LPA as Category A+', () => {
      assert.equal(determineCategory(16.0), 'A+');
      assert.equal(determineCategory(24.5), 'A+');
    });

    it('should classify 10 to <16 LPA as Category A', () => {
      assert.equal(determineCategory(10.0), 'A');
      assert.equal(determineCategory(15.9), 'A');
    });

    it('should classify 6 to <10 LPA as Category B', () => {
      assert.equal(determineCategory(6.0), 'B');
      assert.equal(determineCategory(9.9), 'B');
    });

    it('should classify < 6 LPA as Category C', () => {
      assert.equal(determineCategory(5.5), 'C');
      assert.equal(determineCategory(0.0), 'C');
    });
  });

  describe('Company Category Switching Rules', () => {
    it('Category A+ selected student is NOT allowed to switch to any further drive', () => {
      const student = {
        course: 'M.Sc. DFIS',
        registration_status: 'Registered',
        eligibility_status: 'Eligible',
        placement_status: 'FTE Only',
        active_category: 'A+',
        fte_package: 18.0,
        active_offer_type: 'F',
        cgpa: 9.0,
        backlogs: 0,
        drives_banned_remaining: 0
      };

      const targetDrive = {
        category: 'A+',
        offer_type: 'F',
        fte_package: 25.0,
        min_cgpa: 8.0,
        max_backlogs: 0,
        eligible_courses: ['M.Sc. DFIS']
      };

      const result = evaluateEligibility(student, targetDrive);
      assert.equal(result.allowed, false);
      assert.equal(result.status, 'BLOCKED');
      assert.ok(result.reasons.some(r => r.includes('No switching policy')));
    });

    it('Category A selected student can switch ONLY to Category A+ (>= 16 LPA)', () => {
      const student = {
        course: 'M.Tech. AIDS',
        registration_status: 'Registered',
        eligibility_status: 'Eligible',
        placement_status: 'FTE Only',
        active_category: 'A',
        fte_package: 12.0,
        active_offer_type: 'F',
        cgpa: 8.5,
        backlogs: 0,
        drives_banned_remaining: 0
      };

      // Attempt switch to another Category A drive (14 LPA) -> BLOCKED
      const driveCategoryA = {
        category: 'A',
        offer_type: 'I+F',
        fte_package: 14.0,
        min_cgpa: 8.0,
        max_backlogs: 0,
        eligible_courses: ['M.Tech. AIDS']
      };
      const resultA = evaluateEligibility(student, driveCategoryA);
      assert.equal(resultA.allowed, false);
      assert.ok(resultA.reasons.some(r => r.includes('switching ONLY to Category A+')));

      // Attempt switch to Category A+ drive (20 LPA) -> ALLOWED
      const driveCategoryAPlus = {
        category: 'A+',
        offer_type: 'I+F',
        fte_package: 20.0,
        min_cgpa: 8.0,
        max_backlogs: 0,
        eligible_courses: ['M.Tech. AIDS']
      };
      const resultAPlus = evaluateEligibility(student, driveCategoryAPlus);
      assert.equal(resultAPlus.allowed, true);
    });

    it('Category B selected student can switch ONLY if new package is >= 1.5x existing package', () => {
      const student = {
        course: 'M.Tech. CS',
        registration_status: 'Registered',
        eligibility_status: 'Eligible',
        placement_status: 'FTE Only',
        active_category: 'B',
        fte_package: 8.0, // 1.5x is 12.0 LPA
        active_offer_type: 'F',
        cgpa: 8.5,
        backlogs: 0,
        drives_banned_remaining: 0
      };

      // Drive offering 10.0 LPA (< 1.5x of 8.0 = 12.0) -> BLOCKED
      const driveBelow15x = {
        category: 'A',
        offer_type: 'I+F',
        fte_package: 10.0,
        min_cgpa: 8.0,
        max_backlogs: 0,
        eligible_courses: ['M.Tech. CS']
      };
      const resBelow = evaluateEligibility(student, driveBelow15x);
      assert.equal(resBelow.allowed, false);
      assert.ok(resBelow.reasons.some(r => r.includes('at least 1.5 times the existing package')));

      // Drive offering 12.5 LPA (>= 1.5x of 8.0 = 12.0) -> ALLOWED
      const driveAbove15x = {
        category: 'A',
        offer_type: 'I+F',
        fte_package: 12.5,
        min_cgpa: 8.0,
        max_backlogs: 0,
        eligible_courses: ['M.Tech. CS']
      };
      const resAbove = evaluateEligibility(student, driveAbove15x);
      assert.equal(resAbove.allowed, true);
    });

    it('Category C selected student can switch to higher categories (B, A, A+) with higher CTC', () => {
      const student = {
        course: 'M.Sc. CS',
        registration_status: 'Registered',
        eligibility_status: 'Eligible',
        placement_status: 'FTE Only',
        active_category: 'C',
        fte_package: 5.0,
        active_offer_type: 'F',
        cgpa: 8.0,
        backlogs: 0,
        drives_banned_remaining: 0
      };

      // Drive in same Category C (5.2 LPA) -> BLOCKED
      const driveC = {
        category: 'C',
        offer_type: 'I+F',
        fte_package: 5.2,
        min_cgpa: 7.0,
        max_backlogs: 0,
        eligible_courses: ['M.Sc. CS']
      };
      const resC = evaluateEligibility(student, driveC);
      assert.equal(resC.allowed, false);

      // Drive in Category B (7.5 LPA) -> ALLOWED
      const driveB = {
        category: 'B',
        offer_type: 'I+F',
        fte_package: 7.5,
        min_cgpa: 7.0,
        max_backlogs: 0,
        eligible_courses: ['M.Sc. CS']
      };
      const resB = evaluateEligibility(student, driveB);
      assert.equal(resB.allowed, true);
    });
  });

  describe('Offer Type Restrictions', () => {
    it('Internship-only (I) selected student CANNOT apply for another Internship-only role', () => {
      const student = {
        course: 'M.Sc. DFIS',
        registration_status: 'Registered',
        eligibility_status: 'Eligible',
        placement_status: 'Internship Only',
        active_offer_type: 'I',
        fte_package: 0,
        cgpa: 8.5,
        backlogs: 0,
        drives_banned_remaining: 0
      };

      const targetDriveI = {
        category: 'C',
        offer_type: 'I',
        fte_package: 0,
        min_cgpa: 8.0,
        max_backlogs: 0,
        eligible_courses: ['M.Sc. DFIS']
      };

      const result = evaluateEligibility(student, targetDriveI);
      assert.equal(result.allowed, false);
      assert.ok(result.reasons.some(r => r.includes('cannot apply for another Internship-only role')));
    });

    it('Internship-only (I) selected student CAN apply for FTE or I+F roles', () => {
      const student = {
        course: 'M.Sc. DFIS',
        registration_status: 'Registered',
        eligibility_status: 'Eligible',
        placement_status: 'Internship Only',
        active_offer_type: 'I',
        fte_package: 0,
        cgpa: 8.5,
        backlogs: 0,
        drives_banned_remaining: 0
      };

      const targetDriveFTE = {
        category: 'A',
        offer_type: 'F',
        fte_package: 12.0,
        min_cgpa: 8.0,
        max_backlogs: 0,
        eligible_courses: ['M.Sc. DFIS']
      };

      const result = evaluateEligibility(student, targetDriveFTE);
      assert.equal(result.allowed, true);
    });

    it('Internship + PPO/FTE (I+F) selected student CANNOT participate in any further drives', () => {
      const student = {
        course: 'B.Tech.–M.Tech. CS',
        registration_status: 'Registered',
        eligibility_status: 'Eligible',
        placement_status: 'Internship + PPO/FTE',
        active_offer_type: 'I+F',
        fte_package: 18.0,
        active_category: 'A+',
        cgpa: 9.0,
        backlogs: 0,
        drives_banned_remaining: 0
      };

      const targetDrive = {
        category: 'A+',
        offer_type: 'I+F',
        fte_package: 22.0,
        min_cgpa: 8.0,
        max_backlogs: 0,
        eligible_courses: ['B.Tech.–M.Tech. CS']
      };

      const result = evaluateEligibility(student, targetDrive);
      assert.equal(result.allowed, false);
      assert.ok(result.reasons.some(r => r.includes('already placed in an Internship + PPO/FTE (I+F) role')));
    });
  });

  describe('Attendance and Disciplinary Checks', () => {
    it('Flags student with active unexcused absenteeism ban (3-drive penalty)', () => {
      const student = {
        course: 'M.Sc. DFIS',
        registration_status: 'Registered',
        eligibility_status: 'Eligible',
        placement_status: 'Unplaced',
        cgpa: 8.5,
        backlogs: 0,
        drives_banned_remaining: 3
      };

      const targetDrive = {
        category: 'B',
        offer_type: 'F',
        fte_package: 8.0,
        min_cgpa: 8.0,
        max_backlogs: 0,
        eligible_courses: ['M.Sc. DFIS']
      };

      const result = evaluateEligibility(student, targetDrive);
      assert.equal(result.status, 'FLAGGED_FOR_REVIEW');
      assert.ok(result.reasons.some(r => r.includes('absenteeism policy penalty')));
    });
  });
});
