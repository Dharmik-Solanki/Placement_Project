/**
 * NFSU Student Placement Policy Rule Engine (2026-27 Session)
 * 
 * Implements automated validation and explainable decision-making based on the 
 * official NFSU Student Placement Guidelines.
 */

// Helper to determine category based on CTC in LPA
function determineCategory(ftePackage) {
  const pkg = parseFloat(ftePackage) || 0;
  if (pkg >= 16.0) return 'A+';
  if (pkg >= 10.0) return 'A';
  if (pkg >= 6.0) return 'B';
  return 'C';
}

/**
 * Evaluates whether a student can participate in or be offered a specific drive role.
 * 
 * @param {Object} student - The student record
 * @param {Object} targetDrive - Target recruitment drive / company offer details
 * @param {Array} studentOffers - History of offers the student already holds
 * @returns {Object} { allowed: boolean, status: string, reasons: string[], breakdown: Object }
 */
function evaluateEligibility(student, targetDrive, studentOffers = []) {
  const reasons = [];
  let status = 'ALLOWED'; // 'ALLOWED', 'BLOCKED', 'FLAGGED_FOR_REVIEW'
  const breakdown = {};

  // 1. Placement Registration Verification
  if (student.registration_status === 'Deregistered') {
    status = 'BLOCKED';
    reasons.push('Student is deregistered from the 2026-27 placement process.');
    breakdown.registration = { passed: false, detail: 'Status: Deregistered' };
  } else if (student.registration_status === 'Not Registered') {
    status = 'BLOCKED';
    reasons.push('Student has not registered for campus placements.');
    breakdown.registration = { passed: false, detail: 'Status: Not Registered' };
  } else {
    breakdown.registration = { passed: true, detail: 'Active registration verified' };
  }

  // 2. Departmental Academic Eligibility
  if (student.eligibility_status === 'Ineligible') {
    status = 'BLOCKED';
    reasons.push('Student is marked academically ineligible by the Course Coordinator.');
    breakdown.eligibility = { passed: false, detail: 'Status: Ineligible' };
  } else if (student.eligibility_status === 'Pending Verification') {
    if (status !== 'BLOCKED') status = 'FLAGGED_FOR_REVIEW';
    reasons.push('Student eligibility is pending verification by Course Coordinator.');
    breakdown.eligibility = { passed: false, detail: 'Status: Pending Verification' };
  } else {
    breakdown.eligibility = { passed: true, detail: 'Academic eligibility confirmed' };
  }

  // 3. Absenteeism Exclusion Check (3-drive ban policy)
  if (student.drives_banned_remaining > 0) {
    if (status !== 'BLOCKED') status = 'FLAGGED_FOR_REVIEW';
    reasons.push(
      `Student is temporarily excluded from drives due to unexcused absenteeism policy penalty (${student.drives_banned_remaining} drive(s) remaining). Requires authorized emergency waiver.`
    );
    breakdown.absenteeism = {
      passed: false,
      detail: `${student.drives_banned_remaining} drives exclusion active`
    };
  } else {
    breakdown.absenteeism = { passed: true, detail: 'No active disciplinary/attendance exclusions' };
  }

  // 4. Drive-Specific Eligibility Criteria
  // 4a. Course Match
  let eligibleCourses = [];
  try {
    eligibleCourses = typeof targetDrive.eligible_courses === 'string'
      ? JSON.parse(targetDrive.eligible_courses)
      : (targetDrive.eligible_courses || []);
  } catch (e) {
    eligibleCourses = [targetDrive.eligible_courses];
  }

  if (eligibleCourses.length > 0 && !eligibleCourses.includes(student.course)) {
    status = 'BLOCKED';
    reasons.push(`Student course (${student.course}) is not eligible for this drive. Eligible: ${eligibleCourses.join(', ')}`);
    breakdown.courseMatch = { passed: false, detail: `Course ${student.course} not listed` };
  } else {
    breakdown.courseMatch = { passed: true, detail: `Course ${student.course} is eligible` };
  }

  // 4b. CGPA Check
  const minCgpa = parseFloat(targetDrive.min_cgpa) || 0;
  const studentCgpa = parseFloat(student.cgpa) || 0;
  if (studentCgpa < minCgpa) {
    status = 'BLOCKED';
    reasons.push(`Student CGPA (${studentCgpa}) is below company minimum cutoff (${minCgpa}).`);
    breakdown.cgpaCheck = { passed: false, detail: `CGPA ${studentCgpa} < ${minCgpa}` };
  } else {
    breakdown.cgpaCheck = { passed: true, detail: `CGPA ${studentCgpa} >= ${minCgpa}` };
  }

  // 4c. Active Backlogs Check
  const maxBacklogs = parseInt(targetDrive.max_backlogs, 10) ?? 0;
  const studentBacklogs = parseInt(student.backlogs, 10) || 0;
  if (studentBacklogs > maxBacklogs) {
    status = 'BLOCKED';
    reasons.push(`Student has ${studentBacklogs} active backlogs; company allows at most ${maxBacklogs}.`);
    breakdown.backlogCheck = { passed: false, detail: `${studentBacklogs} backlogs > ${maxBacklogs} allowed` };
  } else {
    breakdown.backlogCheck = { passed: true, detail: `${studentBacklogs} backlogs within allowance (${maxBacklogs})` };
  }

  // 5. Existing Offer and Switching Policy Evaluation
  // Find active / accepted offers or current placement status
  const acceptedOffers = studentOffers.filter(o => o.offer_acceptance === 'Accepted');
  
  // Also check student table's current placed record if offers list is not supplied
  const currentFtePackage = parseFloat(student.fte_package) || 0;
  const currentCategory = student.active_category || (currentFtePackage > 0 ? determineCategory(currentFtePackage) : null);
  const currentOfferType = student.active_offer_type;

  const targetCategory = targetDrive.category || determineCategory(targetDrive.fte_package);
  const targetOfferType = targetDrive.offer_type;
  const targetPackage = parseFloat(targetDrive.fte_package) || 0;

  // 5a. Offer-Type Restrictions:
  // - Internship only (I): Cannot take another I, but may take F or I+F
  // - FTE only (F): Cannot take another F, but may take I
  // - Internship + PPO/FTE (I+F): Cannot participate in any other role
  if (student.placement_status === 'Internship + PPO/FTE' || currentOfferType === 'I+F') {
    status = 'BLOCKED';
    reasons.push('Student is already placed in an Internship + PPO/FTE (I+F) role. Full placement complete; no further drives allowed.');
    breakdown.offerTypeCheck = { passed: false, detail: 'Already placed in I+F role' };
  } else if ((student.placement_status === 'Internship Only' || currentOfferType === 'I') && targetOfferType === 'I') {
    status = 'BLOCKED';
    reasons.push('Student already holds an Internship-only offer. Under policy, students cannot apply for another Internship-only role, though FTE or I+F opportunities remain open.');
    breakdown.offerTypeCheck = { passed: false, detail: 'Duplicate Internship (I) role not permitted' };
  } else if ((student.placement_status === 'FTE Only' || currentOfferType === 'F') && targetOfferType === 'F') {
    status = 'BLOCKED';
    reasons.push('Student already holds an FTE-only offer. Under policy, students cannot apply for another FTE-only role, though an Internship role may be permissible.');
    breakdown.offerTypeCheck = { passed: false, detail: 'Duplicate FTE (F) role not permitted' };
  } else {
    breakdown.offerTypeCheck = { passed: true, detail: 'Offer type transition is permissible under policy' };
  }

  // 5b. CTC Category Switching Rules (applies if student has an existing FTE or compensation package):
  if (currentFtePackage > 0 && targetOfferType !== 'I') {
    if (currentCategory === 'A+') {
      status = 'BLOCKED';
      reasons.push('Student is selected in Category A+ (CTC >= 16 LPA). NFSU Policy states: "No switching policy; students selected in A+ are out of the placement process."');
      breakdown.switchingCheck = { passed: false, detail: 'Category A+ has no switching privilege' };
    } else if (currentCategory === 'A') {
      if (targetCategory !== 'A+') {
        status = 'BLOCKED';
        reasons.push(`Student holds a Category A offer (₹${currentFtePackage} LPA). NFSU Policy allows switching ONLY to Category A+ companies (>= 16 LPA). Target is Category ${targetCategory} (₹${targetPackage} LPA).`);
        breakdown.switchingCheck = { passed: false, detail: 'Category A can only switch to Category A+' };
      } else {
        breakdown.switchingCheck = { passed: true, detail: `Category A to A+ upgrade permitted (${currentFtePackage} LPA -> ${targetPackage} LPA)` };
      }
    } else if (currentCategory === 'B') {
      const minRequiredPackage = currentFtePackage * 1.5;
      if (targetPackage < minRequiredPackage) {
        status = 'BLOCKED';
        reasons.push(
          `Student holds a Category B offer (₹${currentFtePackage} LPA). Under NFSU Policy, further placement is allowed only where the new package is at least 1.5 times the existing package (Minimum required: ₹${minRequiredPackage.toFixed(2)} LPA). Target drive package is ₹${targetPackage} LPA.`
        );
        breakdown.switchingCheck = {
          passed: false,
          detail: `Target ₹${targetPackage} LPA < 1.5x threshold of ₹${minRequiredPackage.toFixed(2)} LPA`
        };
      } else {
        breakdown.switchingCheck = {
          passed: true,
          detail: `Package ₹${targetPackage} LPA satisfies >= 1.5x requirement of existing ₹${currentFtePackage} LPA`
        };
      }
    } else if (currentCategory === 'C') {
      // Below 6 LPA: Eligible for higher category opportunities (B, A, A+)
      if (targetCategory === 'C' || targetPackage <= currentFtePackage) {
        status = 'BLOCKED';
        reasons.push(
          `Student holds a Category C offer (₹${currentFtePackage} LPA). Policy only permits upgrading to higher categories (B, A, A+) with a higher package. Current target is ₹${targetPackage} LPA.`
        );
        breakdown.switchingCheck = { passed: false, detail: 'Cannot switch to same/lower Category C package' };
      } else {
        breakdown.switchingCheck = {
          passed: true,
          detail: `Upgrade from Category C to higher Category ${targetCategory} permitted`
        };
      }
    }
  } else {
    breakdown.switchingCheck = { passed: true, detail: 'No existing FTE package conflict' };
  }

  return {
    allowed: status === 'ALLOWED',
    status, // 'ALLOWED', 'BLOCKED', 'FLAGGED_FOR_REVIEW'
    reasons,
    breakdown,
    targetCategory,
    evaluationTimestamp: new Date().toISOString()
  };
}

module.exports = {
  determineCategory,
  evaluateEligibility
};
